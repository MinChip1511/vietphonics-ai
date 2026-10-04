import torch
import torch.nn as nn
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence

BLANK_ID = 0
DROPOUT = 0.20
ACOUSTIC_CONV_DIM = 128
ACOUSTIC_RNN_HIDDEN = 128
PITCH_CONV_DIM = 64
PITCH_RNN_HIDDEN = 64
PHONETIC_CONV_DIM = 128
PHONETIC_RNN_HIDDEN = 128
LING_EMBED_DIM = 128
LING_RNN_HIDDEN = 256

class ConvStack(nn.Module):
    def __init__(self, in_dim, hid, n, drop):
        super().__init__()
        layers = []
        d = in_dim
        for _ in range(n):
            layers += [
                nn.Conv1d(d, hid, 3, padding=1),
                nn.BatchNorm1d(hid),
                nn.ReLU(),
                nn.Dropout(drop)
            ]
            d = hid
        self.net = nn.Sequential(*layers)
        self.out_dim = hid

    def forward(self, x):
        # x: (B, T, D) -> transpose to (B, D, T) -> net -> transpose back to (B, T, hid)
        return self.net(x.transpose(1, 2)).transpose(1, 2)


class BiLSTMStack(nn.Module):
    def __init__(self, in_dim, hid, n, drop):
        super().__init__()
        self.layers = nn.ModuleList()
        self.norms = nn.ModuleList()
        self.drops = nn.ModuleList()
        d = in_dim
        for _ in range(n):
            self.layers.append(nn.LSTM(d, hid, batch_first=True, bidirectional=True))
            self.norms.append(nn.LayerNorm(hid * 2))
            self.drops.append(nn.Dropout(drop))
            d = hid * 2
        self.out_dim = d

    def forward(self, x, lens):
        for rnn, norm, drop in zip(self.layers, self.norms, self.drops):
            p = pack_padded_sequence(x, lens.cpu(), batch_first=True, enforce_sorted=False)
            p, _ = rnn(p)
            x, _ = pad_packed_sequence(p, batch_first=True)
            x = drop(norm(x))
        return x


class FeatureEncoder(nn.Module):
    def __init__(self, in_dim, conv_dim, n_conv, rnn_hid, n_rnn, drop):
        super().__init__()
        self.conv = ConvStack(in_dim, conv_dim, n_conv, drop)
        self.rnn = BiLSTMStack(self.conv.out_dim, rnn_hid, n_rnn, drop)
        self.out_dim = self.rnn.out_dim

    def forward(self, x, lens):
        return self.rnn(self.conv(x), lens)


class LinguisticEncoder(nn.Module):
    def __init__(self, vocab, emb, hid, qdim, drop):
        super().__init__()
        self.emb = nn.Embedding(vocab, emb, padding_idx=BLANK_ID)
        self.rnn = nn.LSTM(emb, hid, batch_first=True, bidirectional=True)
        self.drop = nn.Dropout(drop)
        self.to_k = nn.Linear(hid * 2, qdim)
        self.to_v = nn.Linear(hid * 2, qdim)

    def forward(self, ids, lens):
        x = self.emb(ids)
        p = pack_padded_sequence(x, lens.cpu(), batch_first=True, enforce_sorted=False)
        p, _ = self.rnn(p)
        x, _ = pad_packed_sequence(p, batch_first=True)
        x = self.drop(x)
        return self.to_k(x), self.to_v(x)


class PAPL_NCCF(nn.Module):
    def __init__(self, vocab=53, ph_in=768):
        super().__init__()
        self.acoustic_encoder = FeatureEncoder(81, ACOUSTIC_CONV_DIM, 2, ACOUSTIC_RNN_HIDDEN, 2, DROPOUT)
        self.pitch_encoder = FeatureEncoder(1, PITCH_CONV_DIM, 2, PITCH_RNN_HIDDEN, 2, DROPOUT)
        self.phonetic_encoder = FeatureEncoder(ph_in, PHONETIC_CONV_DIM, 1, PHONETIC_RNN_HIDDEN, 1, DROPOUT)
        self.query_dim = self.acoustic_encoder.out_dim + self.phonetic_encoder.out_dim + self.pitch_encoder.out_dim
        self.linguistic_encoder = LinguisticEncoder(vocab, LING_EMBED_DIM, LING_RNN_HIDDEN, self.query_dim, DROPOUT)
        self.output = nn.Sequential(nn.Dropout(DROPOUT), nn.Linear(self.query_dim * 2, vocab))

    def forward(self, acoustic, pitch, phonetic, frame_lengths, canonical, canonical_lengths, return_attention=False):
        ha = self.acoustic_encoder(acoustic, frame_lengths)
        hp = self.phonetic_encoder(phonetic, frame_lengths)
        hpi = self.pitch_encoder(pitch, frame_lengths)
        T = min(ha.shape[1], hp.shape[1], hpi.shape[1])
        hq = torch.cat([ha[:, :T], hp[:, :T], hpi[:, :T]], dim=-1)

        hk, hv = self.linguistic_encoder(canonical, canonical_lengths)
        scores = torch.bmm(hq, hk.transpose(1, 2))
        N = hk.shape[1]
        mask = torch.arange(N, device=canonical_lengths.device)[None, :] >= canonical_lengths[:, None]
        scores = scores.masked_fill(mask[:, None, :], -1e4)
        alpha = torch.softmax(scores, dim=-1)
        context = torch.bmm(alpha, hv)

        logits = self.output(torch.cat([context, hq], dim=-1))
        return (logits, alpha) if return_attention else logits
