"""Child-friendly names and hints for every phone the model knows (children aged 4-7).

The model's phone symbols (`s`, `S`, `N`, `w`, `_5a`...) mean nothing to a child or a parent, and IPA
characters (ŋ, ʂ, tone arrows) do not render on every device. Everything shown in the UI comes from
here instead: the written letter(s), a familiar example word and one short instruction without
linguistic terms. The same phone always produces the same hint.

Phone symbols follow VietMDD (s = x, S = s, N = ng, J = nh, 7 = ơ, 7_X = â, M7 = ươ, w = the "u/o"
glide in "xuân" and "hoa", j = the "i/y" glide in "bay", ...).
"""

# token -> (letters shown to the child, example word, short instruction)
_PHONES = {
    # --- initial consonants -------------------------------------------------------------------
    "s": ("x", "xe", "Đặt đầu lưỡi sau răng cửa, thổi hơi nhẹ như tiếng rắn “xì xì”."),
    "S": ("s", "sao", "Cong đầu lưỡi lên một chút rồi thổi hơi ra, nghe như tiếng gió “sờờ”."),
    "ts_": ("tr", "trời", "Cong đầu lưỡi lên rồi bật nhẹ, tiếng nghe dày hơn chữ “ch”."),
    "tS": ("ch", "chim", "Để đầu lưỡi thẳng, áp nhẹ lên vòm miệng rồi bật hơi gọn."),
    "l": ("l", "lá", "Chạm đầu lưỡi lên lợi trên rồi hạ xuống nhanh, như hát “la la la”."),
    "n": ("n", "nơ", "Chạm đầu lưỡi lên lợi trên, cho hơi thoát qua mũi."),
    "N": ("ng", "ngôi", "Nâng cuối lưỡi lên chạm họng, hơi thoát qua mũi, như tiếng “ngờ”."),
    "J": ("nh", "nhà", "Áp mặt lưỡi lên vòm miệng, hơi thoát qua mũi, như tiếng “nhờ”."),
    "m": ("m", "mẹ", "Mím hai môi lại, cho hơi thoát qua mũi như tiếng “mmm”."),
    "b": ("b", "ba", "Mím hai môi rồi mở ra nhẹ nhàng như gọi “ba”."),
    "d": ("đ", "đĩa", "Chạm đầu lưỡi lên lợi trên rồi bật xuống thật gọn."),
    "t": ("t", "tay", "Chạm đầu lưỡi sau răng cửa trên rồi bật hơi nhẹ, không rung cổ."),
    "t_h": ("th", "thỏ", "Chạm đầu lưỡi vào răng cửa rồi thổi hơi mạnh ra như “thờ”."),
    "k": ("c hoặc k", "cá", "Nâng cuối lưỡi chạm sát họng rồi bật nhanh như tiếng “cờ”."),
    "G": ("g", "gà", "Nâng cuối lưỡi lên gần họng, thổi hơi nhẹ như tiếng “gờ”."),
    "h": ("h", "hoa", "Há miệng, thở hơi ra như khi con hà hơi vào tay."),
    "x": ("kh", "khỉ", "Nâng cuối lưỡi lên gần họng rồi thổi hơi ra như tiếng “khờ”."),
    "f": ("ph", "phở", "Răng cửa trên chạm nhẹ môi dưới rồi thổi hơi ra."),
    "v": ("v", "vịt", "Răng cửa trên chạm nhẹ môi dưới, rung nhẹ khi đọc “vờ”."),
    "z": ("d hoặc gi", "da", "Đưa lưỡi sát vòm miệng, thổi hơi rung nhẹ như tiếng “dờ”."),
    "dZ": ("gi", "giờ", "Đưa lưỡi sát vòm miệng, thổi hơi rung nhẹ như tiếng “giờ”."),
    "r": ("r", "rồng", "Đưa lưỡi gần vòm miệng, thổi hơi rung nhẹ như tiếng “rờ”."),
    # --- final consonants ---------------------------------------------------------------------
    "p": ("p", "búp", "Cuối từ, mím hai môi lại và dừng hơi, không bật ra."),
    "kp": ("c", "học", "Cuối từ, khép hai môi tròn lại và dừng hơi ở cổ họng."),
    "wp": ("p", "búp", "Cuối từ, mím hai môi lại và dừng hơi."),
    "Nm": ("ng", "sông", "Cuối từ, nâng cuối lưỡi chạm họng, hai môi tròn nhẹ như đọc “ông”."),
    # --- glides -------------------------------------------------------------------------------
    "w": ("u hoặc o nhỏ", "xuân, hoa", "Chúm môi tròn thật nhanh trước khi đọc vần, như “u” đọc rất nhẹ."),
    "j": ("i hoặc y cuối", "bay", "Cuối từ, kéo lưỡi lên như đọc “i” rất nhanh và nhẹ."),
    # --- vowels -------------------------------------------------------------------------------
    "a": ("a", "ba", "Mở miệng rộng, lưỡi nằm thấp, đọc kéo dài tròn tiếng “a”."),
    "a_X": ("ă", "ăn", "Mở miệng vừa, đọc ngắn và gọn hơn chữ “a”."),
    "7": ("ơ", "sơ", "Mở miệng vừa, môi thả lỏng, đọc “ơ” kéo dài."),
    "7_X": ("â", "ấm", "Mở miệng vừa, môi thả lỏng, đọc “â” ngắn và gọn."),
    "E": ("e", "bé", "Kéo hai khóe miệng sang bên, miệng mở vừa, như tiếng “e”."),
    "e": ("ê", "bê", "Kéo hai khóe miệng sang bên như mỉm cười, miệng mở hẹp hơn chữ “e”."),
    "E_X": ("e ngắn", "anh", "Đọc “e” thật ngắn và gọn."),
    "i": ("i", "chim", "Kéo hai khóe miệng sang bên như cười, miệng mở nhỏ."),
    "O": ("o", "con", "Tròn môi, mở miệng vừa, như tiếng “o”."),
    "o": ("ô", "cô", "Chúm môi tròn nhỏ hơn chữ “o”, đọc “ô”."),
    "O_X": ("o ngắn", "xoong", "Đọc “o” thật ngắn và gọn."),
    "u": ("u", "mũ", "Chúm môi tròn và đẩy ra phía trước như thổi nến."),
    "M": ("ư", "thư", "Kéo hai khóe miệng sang bên, môi không tròn, như tiếng “ư”."),
    "M_X": ("ư ngắn", "cứng", "Đọc “ư” thật ngắn và gọn."),
    "ie": ("iê hoặc ia", "chiều", "Bắt đầu bằng “i” rồi trượt nhanh sang “ê” hoặc “a”."),
    "uo": ("uô hoặc ua", "muối", "Bắt đầu bằng “u” rồi trượt nhanh sang “ô” hoặc “a”."),
    "M7": ("ươ hoặc ưa", "nước", "Bắt đầu bằng “ư” rồi trượt nhanh sang “ơ” hoặc “a”."),
    # --- tones --------------------------------------------------------------------------------
    "_1": ("—", "ba", "Thanh ngang: giữ giọng đều và phẳng từ đầu đến cuối, như khi nói “ba”."),
    "_2": ("`", "bà", "Thanh huyền: để giọng đi xuống nhẹ nhàng, như đang nói “bà…”."),
    "_3": ("~", "bã", "Thanh ngã: giọng ngắt một chút ở giữa rồi vút lên, như “bã”."),
    "_4": ("?", "bả", "Thanh hỏi: giọng hạ xuống rồi nâng lên, như đang hỏi “bả?”."),
    "_5a": ("´", "bá", "Thanh sắc: đẩy giọng đi lên nhanh, như khi ngạc nhiên “bá!”."),
    "_5b": ("´", "bát", "Thanh sắc: đẩy giọng đi lên rồi dừng gọn ở cuối từ."),
}

_TONE_NAMES = {
    "_1": "ngang", "_2": "huyền", "_3": "ngã", "_4": "hỏi",
    "_5a": "sắc", "_5b": "sắc", "_6a": "nặng", "_6b": "nặng",
}
_TONE_HINTS = {
    "_6a": ("·", "bạ", "Thanh nặng: nhấn giọng xuống thấp và dừng lại ngay, như “bạ”."),
    "_6b": ("·", "bạc", "Thanh nặng: nhấn giọng xuống thấp và dừng gọn ở cuối từ."),
}


def _entry(token):
    if token in _TONE_HINTS:
        return _TONE_HINTS[token]
    return _PHONES.get(token)


def hint(token):
    """Return {symbol, name, example, tip} for a phone token (generic fallback for unknown ones)."""
    if token is None:
        return {"symbol": "—", "name": "âm này", "example": "", "tip": ""}
    entry = _entry(token)
    if entry is None:
        return {"symbol": token, "name": "âm này", "example": "", "tip": "Con đọc chậm và rõ âm này nhé."}
    symbol, example, tip = entry
    if token in _TONE_NAMES:
        name = f"thanh {_TONE_NAMES[token]}"
    else:
        name = f"chữ {symbol}"
    return {"symbol": symbol, "name": name, "example": example, "tip": tip}


def is_tone(token):
    return token in _TONE_NAMES


_NUCLEUS = {"a", "a_X", "7", "7_X", "E", "e", "E_X", "i", "O", "o", "O_X", "u", "M", "M_X", "ie", "uo", "M7", "w", "j"}
_ALWAYS_FINAL = {"Nm", "kp", "wp", "p"}


def is_nucleus(token):
    return token in _NUCLEUS


def is_final_only(token):
    return token in _ALWAYS_FINAL
