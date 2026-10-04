"""Name filter for child profiles (and the same rules are mirrored in frontend/src/services/validators.js).

Blocks insults, profanity and slurs in names. It is a starting list: extend the tuples below as the team
reports new words. Matching is done per word (not on the whole text glued together) so that ordinary
Vietnamese names containing a blocked string by accident are not rejected.
"""
import re
import unicodedata

# Words that are only blocked when they match exactly, with diacritics (typed correctly by the child).
_EXACT_WITH_DIACRITICS = {
    "đụ", "địt", "đéo", "đĩ", "điếm", "lồn", "cặc", "cứt", "buồi", "đm", "đmm", "đcm", "đcmm",
}
# Words blocked when a word matches exactly after removing diacritics and undoing "1337" spelling.
_EXACT_FOLDED = {
    "dm", "dmm", "dcm", "dcmm", "dkm", "vcl", "vkl", "cmm", "cmn", "clm",
    "dick", "cock", "penis", "vagina", "porn", "sex", "ass", "arse", "fag", "kike", "chink", "spic",
}
# Blocked when a word merely contains them (long enough that false positives are very unlikely).
_SUBSTRINGS = (
    "nigg", "fuck", "shit", "bitch", "cunt", "pussy", "asshole", "faggot", "whore", "slut", "retard",
)
# Blocked as phrases (compared after removing diacritics, words separated by one space).
_PHRASES = ("dit me", "du me", "dit con", "dit cu", "khon nan", "suc vat", "cho de")

_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i"})


def _fold(text):
    nfd = unicodedata.normalize("NFD", unicodedata.normalize("NFC", text or "").lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").replace("đ", "d")


def _words(text):
    return re.findall(r"[^\W_]+", text)


def find_inappropriate(text):
    """Return the blocked word/phrase found in `text`, or None when the name is fine."""
    raw = unicodedata.normalize("NFC", text or "").lower()
    for word in _words(raw):
        if word in _EXACT_WITH_DIACRITICS:
            return word

    folded = _fold(text).translate(_LEET)
    words = _words(folded)
    for word in words:
        if word in _EXACT_FOLDED:
            return word
        for bad in _SUBSTRINGS:
            if bad in word:
                return bad
    # "n i g g a": a run of single letters is read as one word
    run = []
    for word in words + [""]:
        if len(word) == 1:
            run.append(word)
            continue
        joined = "".join(run)
        run = []
        for bad in _SUBSTRINGS:
            if len(joined) >= 4 and bad in joined:
                return bad
    spaced = " ".join(words)
    for phrase in _PHRASES:
        if phrase in spaced:
            return phrase
    return None


def is_inappropriate(text):
    return find_inappropriate(text) is not None
