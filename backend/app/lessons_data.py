# Official VietPhonics AI Curriculum (Giáo án tổng thể 4-7 tuổi)
# Structure follows Section 3 & 21 of the curriculum specification

CATEGORIES = [
    {"id": "all", "name": "Tất cả bài học (11 bài)", "icon": "🌈"},
    {"id": "diagnostic", "name": "Level 0: Khảo sát ban đầu", "icon": "🧭"},
    {"id": "initial_consonants", "name": "Level 1: Âm đầu (S/X, TR/CH, L/N)", "icon": "🗣️"},
    {"id": "final_consonants", "name": "Level 2: Âm cuối (N/NG, T/C)", "icon": "🔚"},
    {"id": "vowels", "name": "Level 3: Nguyên âm & Vần", "icon": "🔡"},
    {"id": "tones", "name": "Level 4: Thanh điệu (6 Thanh)", "icon": "🎵"},
    {"id": "combined", "name": "Level 5: Kết hợp âm & Từ khó", "icon": "🧩"},
    {"id": "sentences", "name": "Level 6: Phát âm trong câu", "icon": "📖"}
]

LESSONS = [
    # Level 0: Diagnostic
    {
        "id": "lesson-0",
        "title": "Khảo sát phát âm ban đầu",
        "level": 0,
        "category": "diagnostic",
        "category_name": "Khảo sát",
        "difficulty": "Dễ",
        "duration": "5 phút",
        "icon": "🧭",
        "description": "Kiểm tra 10 âm vị cốt lõi để xây dựng Pronunciation Profile riêng cho bé.",
        "target_phonemes": ["b", "m", "s", "x", "ts_", "tS", "_1", "_5a", "_4", "_3"],
        "warmup": ["ba", "mẹ", "cá", "hoa"],
        "discrimination_game": {
            "prompt": "cá",
            "options": ["Cá", "Cà"],
            "correct": "Cá"
        },
        "mouth_guide": {
            "title": "Cách đặt môi và thả lỏng",
            "tip": "Bé ngồi thẳng lưng, thả lỏng quai hàm và phát âm to rõ theo nhịp thở đều.",
            "tongue": "Lưỡi thả lỏng ở đáy miệng."
        },
        "syllables": ["ba", "mẹ", "bé", "cá", "hoa", "nhà"],
        "words": [
            {"word": "Ba", "phoneme": "b", "canonical": "b a _1", "illustration": "👨", "guide": "Mím môi nhẹ rồi bật âm B."},
            {"word": "Mẹ", "phoneme": "m", "canonical": "m E _6a", "illustration": "👩", "guide": "Âm M thoát nhẹ qua mũi, nhấn thanh nặng."},
            {"word": "Bé", "phoneme": "_5a", "canonical": "b E _5a", "illustration": "👶", "guide": "Vút giọng cao với thanh sắc."},
            {"word": "Cá", "phoneme": "k", "canonical": "k a _5a", "illustration": "🐟", "guide": "Bật cuống lưỡi âm C và lên giọng thanh sắc."},
            {"word": "Hoa", "phoneme": "_1", "canonical": "h w a _1", "illustration": "🌸", "guide": "Giữ giọng bằng phẳng với thanh ngang."},
            {"word": "Nhà", "phoneme": "_2", "canonical": "J a _2", "illustration": "🏡", "guide": "Hạ giọng nhẹ nhàng với thanh huyền."}
        ],
        "minimal_pairs": [
            {"word1": "ba", "word2": "bà", "focus": "Thanh ngang vs Thanh huyền"},
            {"word1": "cá", "word2": "cà", "focus": "Thanh sắc vs Thanh huyền"}
        ],
        "sentences": [
            {"sentence": "Ba mẹ yêu bé.", "canonical": "b a _1 m E _6a iew _1 b E _5a"}
        ]
    },

    # Level 1: Lesson 1 - S / X
    {
        "id": "lesson-s-x",
        "title": "Bài 1: Phân biệt âm S và X",
        "level": 1,
        "category": "initial_consonants",
        "category_name": "Âm đầu",
        "difficulty": "Dễ",
        "duration": "8-10 phút",
        "icon": "🌟",
        "description": "Luyện uốn cong lưỡi với âm S và phát âm nhẹ nhàng với âm X để không bị nhầm lẫn.",
        "target_phonemes": ["S", "s"],
        "warmup": ["sa – xa", "sôi – xôi", "sáng – xáng"],
        "discrimination_game": {
            "prompt": "sông",
            "options": ["Sông", "Xông"],
            "correct": "Sông"
        },
        "mouth_guide": {
            "title": "Khẩu hình âm S (uốn lưỡi) vs âm X (thẳng lưỡi)",
            "tip": "Âm S: Đầu lưỡi uốn cong lên chạm vòm miệng cứng, đẩy hơi mạnh. Âm X: Lưỡi để thẳng sát chân răng cửa trên, đẩy hơi nhẹ nhàng.",
            "tongue": "Uốn cong lưỡi (S) ↔ Lưỡi bằng mỉm cười (X)"
        },
        "syllables": ["sa", "se", "si", "so", "su", "xa", "xe", "xi", "xo", "xu"],
        "words": [
            {"word": "Ngôi sao", "phoneme": "S", "canonical": "N O i _1 S a w _1", "illustration": "⭐", "guide": "Uốn cong đầu lưỡi lên vòm miệng trên khi đọc 'sao'."},
            {"word": "Xe đạp", "phoneme": "s", "canonical": "s E _1 d a_X p _6b", "illustration": "🚲", "guide": "Lưỡi bằng phẳng, đẩy hơi nhẹ qua kẽ răng khi đọc 'xe'."},
            {"word": "Sách vở", "phoneme": "S", "canonical": "S a_X k _5b v 7 _4", "illustration": "📚", "guide": "Uốn cong đầu lưỡi và bật dứt khoát."},
            {"word": "Xinh xắn", "phoneme": "s", "canonical": "s i J _1 s a_X n _5a", "illustration": "🌸", "guide": "Mỉm cười nhẹ và đẩy luồng hơi mềm mại."},
            {"word": "Dòng sông", "phoneme": "S", "canonical": "z O N _2 S O N _1", "illustration": "🌊", "guide": "Âm S uốn lưỡi tạo tiếng xào xạc rõ ràng."},
            {"word": "Đĩa xôi", "phoneme": "s", "canonical": "d i_E _3 s O j _1", "illustration": "🍚", "guide": "Âm X không uốn cong lưỡi."},
            {"word": "Quả xoài", "phoneme": "s", "canonical": "k w a _4 s w a j _2", "illustration": "🥭", "guide": "Thân lưỡi bằng phẳng, lướt êm."},
            {"word": "Mùa xuân", "phoneme": "s", "canonical": "m uo _2 s w a_X n _1", "illustration": "🌱", "guide": "Âm X nhẹ nhàng, tươi vui."}
        ],
        "minimal_pairs": [
            {"word1": "sôi", "word2": "xôi", "focus": "Nước sôi (uốn lưỡi S) vs Ăn xôi (nhẹ X)"},
            {"word1": "sương", "word2": "xương", "focus": "Giọt sương (S) vs Khung xương (X)"},
            {"word1": "sáo", "word2": "xáo", "focus": "Cây sáo (S) vs Xáo trộn (X)"}
        ],
        "sentences": [
            {"sentence": "Bé xem sách.", "canonical": "b E _5a s E m _1 S a_X k _5b"},
            {"sentence": "Xe màu xanh.", "canonical": "s E _1 m a w _2 s a_X J _1"},
            {"sentence": "Sáng nay trời rất đẹp.", "canonical": "S a N _5a n a j _1 ts_ 7_X j _2 z a_X t _5b d E p _6b"}
        ]
    },

    # Level 1: Lesson 2 - TR / CH
    {
        "id": "lesson-tr-ch",
        "title": "Bài 2: Phân biệt âm TR và CH",
        "level": 1,
        "category": "initial_consonants",
        "category_name": "Âm đầu",
        "difficulty": "Trung bình",
        "duration": "8-10 phút",
        "icon": "🌴",
        "description": "Bé cùng luyện âm TR uốn lưỡi bật hơi mạnh và âm CH thân lưỡi áp vòm họng.",
        "target_phonemes": ["ts_", "tS"],
        "warmup": ["tra – cha", "tranh – chanh", "trăng – chăng"],
        "discrimination_game": {
            "prompt": "trăng",
            "options": ["Trăng", "Chăng"],
            "correct": "Trăng"
        },
        "mouth_guide": {
            "title": "Khẩu hình TR vs CH",
            "tip": "Âm TR: Đầu lưỡi uốn cong chạm vòm miệng trước rồi bật mạnh luồng hơi ra ngoài. Âm CH: Thân lưỡi áp nhẹ vào vòm trên, không uốn cong lưỡi.",
            "tongue": "Uốn lưỡi bật hơi (TR) ↔ Thân lưỡi áp vòm (CH)"
        },
        "syllables": ["tra", "tre", "tri", "tro", "tru", "cha", "che", "chi", "cho", "chu"],
        "words": [
            {"word": "Mặt trăng", "phoneme": "ts_", "canonical": "m a_X t _6b ts_ a_X N _1", "illustration": "🌕", "guide": "Uốn cong đầu lưỡi bật mạnh ở âm 'trăng'."},
            {"word": "Chú chim", "phoneme": "tS", "canonical": "tS u _5a tS i m _1", "illustration": "🐦", "guide": "Lưỡi bằng, thân lưỡi áp nhẹ vòm họng."},
            {"word": "Bầu trời", "phoneme": "ts_", "canonical": "b 7_X w _2 ts_ 7_X j _2", "illustration": "🌤️", "guide": "Uốn lưỡi chắc chắn với âm TR."},
            {"word": "Quả chuối", "phoneme": "tS", "canonical": "k w a _4 tS uo j _5a", "illustration": "🍌", "guide": "Bật hơi gọn gàng, không uốn lưỡi."},
            {"word": "Bức tranh", "phoneme": "ts_", "canonical": "b M_X k _5b ts_ a_X J _1", "illustration": "🎨", "guide": "Uốn cong đầu lưỡi tạo âm TR dứt khoát."},
            {"word": "Chong chóng", "phoneme": "tS", "canonical": "tS O N _1 tS O N _5a", "illustration": "🏵️", "guide": "Phát âm tròn vành rõ chữ âm CH."}
        ],
        "minimal_pairs": [
            {"word1": "tranh", "word2": "chanh", "focus": "Bức tranh (TR) vs Quả chanh (CH)"},
            {"word1": "trưa", "word2": "chưa", "focus": "Buổi trưa (TR) vs Chưa về (CH)"}
        ],
        "sentences": [
            {"sentence": "Chim chơi trên cành.", "canonical": "tS i m _1 tS 7_X j _1 ts_ e n _1 k a_X J _2"},
            {"sentence": "Trăng sáng trên trời.", "canonical": "ts_ a_X N _1 S a N _5a ts_ e n _1 ts_ 7_X j _2"}
        ]
    },

    # Level 1: Lesson 3 - L / N
    {
        "id": "lesson-l-n",
        "title": "Bài 3: Phân biệt âm L và N",
        "level": 1,
        "category": "initial_consonants",
        "category_name": "Âm đầu",
        "difficulty": "Trung bình",
        "duration": "8-10 phút",
        "icon": "🍀",
        "description": "Khắc phục lỗi phát âm L - N phổ biến, nhận biết hơi thoát bên mép lưỡi hay lên mũi.",
        "target_phonemes": ["l", "n"],
        "warmup": ["la – na", "lăn – năn", "làng – nàng"],
        "discrimination_game": {
            "prompt": "lúa",
            "options": ["Lúa", "Núa"],
            "correct": "Lúa"
        },
        "mouth_guide": {
            "title": "Khẩu hình L vs N",
            "tip": "Âm L: Đầu lưỡi dán nướu răng trên, khi hạ lưỡi luồng hơi thoát ra hai bên mép lưỡi. Âm N: Đầu lưỡi giữ ở nướu răng trên, luồng hơi thoát lên mũi.",
            "tongue": "Hơi thoát hai bên mép (L) ↔ Hơi thoát lên mũi (N)"
        },
        "syllables": ["la", "le", "li", "lo", "lu", "na", "ne", "ni", "no", "nu"],
        "words": [
            {"word": "Hoa lan", "phoneme": "l", "canonical": "h w a _1 l a n _1", "illustration": "🌺", "guide": "Đầu lưỡi dán nướu trên, hạ nhanh tạo âm L."},
            {"word": "Nụ cười", "phoneme": "n", "canonical": "n u _6a k M7 j _2", "illustration": "😊", "guide": "Hơi thoát qua mũi tạo âm N vang gọn."},
            {"word": "Lúa vàng", "phoneme": "l", "canonical": "l uo _5a v a N _2", "illustration": "🌾", "guide": "Luồng hơi thoát hai bên mép lưỡi."},
            {"word": "Cái nón", "phoneme": "n", "canonical": "k a j _5a n O n _5a", "illustration": "👒", "guide": "Giữ đầu lưỡi ở nướu khi bắt đầu âm N."},
            {"word": "Lá sen", "phoneme": "l", "canonical": "l a _5a s E n _1", "illustration": "🍃", "guide": "Hạ nhanh lưỡi xuống."},
            {"word": "Nắng ấm", "phoneme": "n", "canonical": "n a_X N _5a 7_X m _5a", "illustration": "☀️", "guide": "Hơi thoát qua cánh mũi."}
        ],
        "minimal_pairs": [
            {"word1": "làng", "word2": "nàng", "focus": "Làng xóm (L) vs Nàng tiên (N)"},
            {"word1": "lá", "word2": "ná", "focus": "Lá cây (L) vs Cái ná (N)"}
        ],
        "sentences": [
            {"sentence": "Lá nằm trên nền.", "canonical": "l a _5a n a_X m _2 ts_ e n _1 n e n _2"},
            {"sentence": "Lan đội nón đi học.", "canonical": "l a n _1 d o j _6a n O n _5a d i _1 h O k _6b"}
        ]
    },

    # Level 2: Lesson 4 - N / NG cuối
    {
        "id": "lesson-final-n-ng",
        "title": "Bài 4: Phân biệt âm cuối N và NG",
        "level": 2,
        "category": "final_consonants",
        "category_name": "Âm cuối",
        "difficulty": "Dễ",
        "duration": "6-8 phút",
        "icon": "🔔",
        "description": "Khép khẩu hình đúng cách khi kết thúc từ với âm N và âm NG.",
        "target_phonemes": ["n", "N", "Nm"],
        "warmup": ["bàn – bằng", "con – cong", "sen – seng"],
        "discrimination_game": {
            "prompt": "sông",
            "options": ["Sông", "Sôn"],
            "correct": "Sông"
        },
        "mouth_guide": {
            "title": "Khẩu hình kết thúc từ N vs NG",
            "tip": "Âm cuối N: Đầu lưỡi dán vào nướu răng trên khi dứt từ. Âm cuối NG: Cuống lưỡi nâng lên chạm vòm họng mềm phía sau.",
            "tongue": "Đầu lưỡi chạm nướu (N cuối) ↔ Cuống lưỡi chạm vòm mềm (NG cuối)"
        },
        "syllables": ["an", "ang", "on", "ong", "en", "eng"],
        "words": [
            {"word": "Bạn bè", "phoneme": "n", "canonical": "b a_X n _6a b E _2", "illustration": "🤝", "guide": "Dán đầu lưỡi vào nướu trên khi dứt từ 'bạn'."},
            {"word": "Bóng bay", "phoneme": "Nm", "canonical": "b O Nm _5a b a j _1", "illustration": "🎈", "guide": "Cuống lưỡi nâng chạm vòm mềm ở từ 'bóng'."},
            {"word": "Con cá", "phoneme": "n", "canonical": "k O n _1 k a _5a", "illustration": "🐠", "guide": "Âm cuối N giữ đầu lưỡi ở nướu."},
            {"word": "Ánh sáng", "phoneme": "N", "canonical": "a_X J _5a S a N _5a", "illustration": "✨", "guide": "Âm cuối NG mở nhẹ miệng, ngắt ở cuống họng."},
            {"word": "Búp sen", "phoneme": "n", "canonical": "b u p _5b s E n _1", "illustration": "🪷", "guide": "Đầu lưỡi dán chắc khi dứt tiếng."},
            {"word": "Dòng sông", "phoneme": "Nm", "canonical": "z O N _2 S O Nm _1", "illustration": "🌊", "guide": "Hai môi hơi khép tròn sau âm Ô."}
        ],
        "minimal_pairs": [
            {"word1": "bàn", "word2": "bàng", "focus": "Cái bàn (N cuối) vs Cây bàng (NG cuối)"},
            {"word1": "lan", "word2": "lang", "focus": "Hoa lan (N cuối) vs Khoai lang (NG cuối)"}
        ],
        "sentences": [
            {"sentence": "Con cá vàng bơi trong sông.", "canonical": "k O n _1 k a _5a v a N _2 b 7_X j _1 ts_ O N _1 S O Nm _1"}
        ]
    },

    # Level 2: Lesson 5 - T / C cuối
    {
        "id": "lesson-final-t-c",
        "title": "Bài 5: Phân biệt âm cuối T và C",
        "level": 2,
        "category": "final_consonants",
        "category_name": "Âm cuối",
        "difficulty": "Trung bình",
        "duration": "6-8 phút",
        "icon": "🎯",
        "description": "Nhận biết vị trí chặn hơi ở đầu lưỡi (T) hay cuống lưỡi (C) khi dứt từ.",
        "target_phonemes": ["t", "k"],
        "warmup": ["mát – mác", "bát – bác", "hát – hác"],
        "discrimination_game": {
            "prompt": "mát",
            "options": ["Mát", "Mác"],
            "correct": "Mát"
        },
        "mouth_guide": {
            "title": "Khẩu hình T cuối vs C cuối",
            "tip": "Âm cuối T: Đầu lưỡi chạm răng trên chặn luồng hơi dứt khoát. Âm cuối C: Cuống lưỡi nâng lên chạm ngạc mềm chặn luồng hơi.",
            "tongue": "Chặn hơi ở đầu lưỡi (T) ↔ Chặn hơi ở cuống họng (C)"
        },
        "syllables": ["at", "ac", "ot", "oc", "et", "ec"],
        "words": [
            {"word": "Gió mát", "phoneme": "t", "canonical": "z O _5a m a t _5b", "illustration": "🍃", "guide": "Đầu lưỡi dán răng trên chặn hơi ở từ 'mát'."},
            {"word": "Học bài", "phoneme": "k", "canonical": "h O k _6b b a j _2", "illustration": "📖", "guide": "Cuống lưỡi chặn hơi dứt khoát ở từ 'học'."},
            {"word": "Bài hát", "phoneme": "t", "canonical": "b a j _2 h a t _5b", "illustration": "🎤", "guide": "Đầu lưỡi chặn hơi âm T."},
            {"word": "Bác nông dân", "phoneme": "k", "canonical": "b a k _5b n O N _1 z a_X n _1", "illustration": "👨‍🌾", "guide": "Ngắt hơi ở cuống họng âm C."}
        ],
        "minimal_pairs": [
            {"word1": "mát", "word2": "mác", "focus": "Gió mát (T cuối) vs Nhãn mác (C cuối)"},
            {"word1": "bát", "word2": "bác", "focus": "Bát cơm (T cuối) vs Bác nông dân (C cuối)"}
        ],
        "sentences": [
            {"sentence": "Bé đọc bài hát rất hay.", "canonical": "b E _5a d O k _6b b a j _2 h a t _5b z a_X t _5b h a j _1"}
        ]
    },

    # Level 4: Lesson 6 - Thanh Ngang & Thanh Sắc
    {
        "id": "lesson-tones-ngang-sac",
        "title": "Bài 6: Thanh Ngang và Thanh Sắc",
        "level": 4,
        "category": "tones",
        "category_name": "Thanh điệu",
        "difficulty": "Dễ",
        "duration": "6-8 phút",
        "icon": "⚡",
        "description": "Luyện giữ cao độ bằng phẳng (Thanh Ngang) và vút giọng cao vút (Thanh Sắc).",
        "target_phonemes": ["_1", "_5a", "_5b"],
        "warmup": ["ma – má", "ba – bá", "hoa – hoá"],
        "discrimination_game": {
            "prompt": "má",
            "options": ["Má", "Ma"],
            "correct": "Má"
        },
        "mouth_guide": {
            "title": "Đường cao độ Thanh Ngang vs Thanh Sắc",
            "tip": "Thanh Ngang: Giữ giọng đều đều như tiếng đàn ngân. Thanh Sắc: Vút giọng cao lên nhanh và sáng rõ ở cuối âm tiết.",
            "tongue": "Giọng bằng phẳng ⎯ (Ngang) ↔ Vút cao lên ↗ (Sắc)"
        },
        "syllables": ["ma", "má", "ba", "bá", "ca", "cá"],
        "words": [
            {"word": "Con ma", "phoneme": "_1", "canonical": "k O N _1 m a _1", "illustration": "👻", "guide": "Giọng đều đều thanh ngang."},
            {"word": "Má hồng", "phoneme": "_5a", "canonical": "m a _5a h O N _2", "illustration": "😊", "guide": "Vút giọng cao thanh sắc."},
            {"word": "Bé cá", "phoneme": "_5a", "canonical": "b E _5a k a _5a", "illustration": "🐠", "guide": "Lên giọng sáng rõ ở cả 2 từ."},
            {"word": "Nắng sớm", "phoneme": "_5a", "canonical": "n a_X N _5a S 7_X m _5a", "illustration": "☀️", "guide": "Vút giọng cao vút."}
        ],
        "minimal_pairs": [
            {"word1": "ma", "word2": "má", "focus": "Con ma (Ngang) vs Má hồng (Sắc)"},
            {"word1": "ba", "word2": "bá", "focus": "Ba mẹ (Ngang) vs Bá tước (Sắc)"}
        ],
        "sentences": [
            {"sentence": "Má mua cá cho bé.", "canonical": "m a _5a m uo _1 k a _5a tS O _1 b E _5a"}
        ]
    },

    # Level 4: Lesson 7 - Thanh Huyền & Thanh Nặng
    {
        "id": "lesson-tones-huyen-nang",
        "title": "Bài 7: Thanh Huyền và Thanh Nặng",
        "level": 4,
        "category": "tones",
        "category_name": "Thanh điệu",
        "difficulty": "Dễ",
        "duration": "6-8 phút",
        "icon": "⚓",
        "description": "Hạ thấp giọng dần êm ái (Thanh Huyền) và nhấn giọng dứt khoát sâu (Thanh Nặng).",
        "target_phonemes": ["_2", "_6a", "_6b"],
        "warmup": ["mà – mạ", "bà – bạ", "nhà – nhạ"],
        "discrimination_game": {
            "prompt": "nhà",
            "options": ["Nhà", "Nhạ"],
            "correct": "Nhà"
        },
        "mouth_guide": {
            "title": "Đường cao độ Thanh Huyền vs Thanh Nặng",
            "tip": "Thanh Huyền: Hạ giọng từ từ xuống nốt trầm. Thanh Nặng: Nhấn giọng sâu xuống và ngắt hơi dứt khoát.",
            "tongue": "Hạ giọng nhẹ ↘ (Huyền) ↔ Nhấn sâu ngắt dứt ˀ˩ (Nặng)"
        },
        "syllables": ["mà", "mạ", "bà", "bạ", "gà", "gạ"],
        "words": [
            {"word": "Ngôi nhà", "phoneme": "_2", "canonical": "N O i _1 J a _2", "illustration": "🏡", "guide": "Hạ thấp giọng dần ở từ 'nhà'."},
            {"word": "Mặt trời", "phoneme": "_6b", "canonical": "m a_X t _6b ts_ 7_X j _2", "illustration": "🌞", "guide": "Nhấn giọng thật sâu ở từ 'mặt'."},
            {"word": "Con gà", "phoneme": "_2", "canonical": "k O N _1 G a _2", "illustration": "🐔", "guide": "Hạ giọng êm ái."},
            {"word": "Bạn học", "phoneme": "_6a", "canonical": "b a_X n _6a h O k _6b", "illustration": "🎒", "guide": "Dứt khoát âm tiết nặng."}
        ],
        "minimal_pairs": [
            {"word1": "bà", "word2": "bạ", "focus": "Bà ngoại (Huyền) vs Bạ đâu ngồi đấy (Nặng)"},
            {"word1": "mà", "word2": "mạ", "focus": "Nhưng mà (Huyền) vs Cây mạ non (Nặng)"}
        ],
        "sentences": [
            {"sentence": "Bà ở nhà nuôi gà.", "canonical": "b a _2 7_X _4 J a _2 n uo j _1 G a _2"}
        ]
    },

    # Level 4: Lesson 8 - Thanh Hỏi & Thanh Ngã
    {
        "id": "lesson-tones-hoi-nga",
        "title": "Bài 8: Thanh Hỏi (?) và Thanh Ngã (~)",
        "level": 4,
        "category": "tones",
        "category_name": "Thanh điệu",
        "difficulty": "Thử thách",
        "duration": "8-10 phút",
        "icon": "🎵",
        "description": "Chinh phục cặp thanh điệu khó nhất trong tiếng Việt: luyến giọng trầm bổng đúng nốt.",
        "target_phonemes": ["_4", "_3"],
        "warmup": ["mả – mã", "cỏ – cõ", "sữa – sửa"],
        "discrimination_game": {
            "prompt": "con muỗi",
            "options": ["Con muỗi", "Con muổi"],
            "correct": "Con muỗi"
        },
        "mouth_guide": {
            "title": "Khẩu hình Thanh Hỏi vs Thanh Ngã",
            "tip": "Thanh Hỏi: Hạ giọng xuống đáy trầm rồi khẽ đưa bổng lên nhẹ. Thanh Ngã: Bắt đầu ở nốt cao, khẽ ngắt hơi ở họng rồi ngân vút lên.",
            "tongue": "Trầm bổng ˀ˥ (Hỏi) ↔ Ngắt hơi ngân cao ↗̃ (Ngã)"
        },
        "syllables": ["mả", "mã", "cỏ", "cõ", "bảo", "bão"],
        "words": [
            {"word": "Củ cải", "phoneme": "_4", "canonical": "k u _4 k a j _4", "illustration": "🥕", "guide": "Hạ thấp giọng xuống đáy rồi khẽ đưa bổng lên nhẹ."},
            {"word": "Con muỗi", "phoneme": "_3", "canonical": "k O N _1 m uo j _3", "illustration": "🦟", "guide": "Nâng cao giọng, ngắt hơi nhẹ ở cổ họng rồi ngân lên."},
            {"word": "Cái mũ", "phoneme": "_3", "canonical": "k a j _5a m u _3", "illustration": "🧢", "guide": "Thanh ngã ngân cao hơn thanh hỏi."},
            {"word": "Quả ổi", "phoneme": "_4", "canonical": "k w a _4 O j _4", "illustration": "🍐", "guide": "Uốn giọng trầm bổng êm ái."},
            {"word": "Hộp sữa", "phoneme": "_3", "canonical": "h O p _6b S M_X _3", "illustration": "🥛", "guide": "Âm S uốn lưỡi kết hợp thanh ngã ngân vang."}
        ],
        "minimal_pairs": [
            {"word1": "mả", "word2": "mã", "focus": "Mồ mả (Hỏi) vs Con mã (Ngã)"},
            {"word1": "cỏ", "word2": "cõ", "focus": "Bãi cỏ (Hỏi) vs Cõng bạn (Ngã)"}
        ],
        "sentences": [
            {"sentence": "Bé uống sữa ngã vào đệm.", "canonical": "b E _5a u_X N _5a S M_X _3 N a _3 v a w _2 d e m _6a"}
        ]
    },

    # Level 4: Lesson 9 - 6 Thanh Điệu (Tone Challenge)
    {
        "id": "lesson-6-tones",
        "title": "Bài 9: Sáu Thanh Điệu Cùng Một Âm Tiết",
        "level": 4,
        "category": "tones",
        "category_name": "Thanh điệu",
        "difficulty": "Thử thách",
        "duration": "10 phút",
        "icon": "👑",
        "description": "Đỉnh cao phát âm tiếng Việt: rèn luyện chuỗi 6 thanh điệu liên hoàn ma - má - mà - mả - mã - mạ.",
        "target_phonemes": ["_1", "_5a", "_2", "_4", "_3", "_6a"],
        "warmup": ["ma", "má", "mà", "mả", "mã", "mạ"],
        "discrimination_game": {
            "prompt": "mả",
            "options": ["Mả", "Mã", "Má"],
            "correct": "Mả"
        },
        "mouth_guide": {
            "title": "Bản đồ cao độ 6 thanh điệu",
            "tip": "Ngang (55) ⎯ • Sắc (35) ↗ • Huyền (21) ↘ • Hỏi (312) ˀ˥ • Ngã (305) ↗̃ • Nặng (21) ˀ˩",
            "tongue": "Kiểm soát cao độ thanh quản linh hoạt theo đồ thị F0."
        },
        "syllables": ["ma", "má", "mà", "mả", "mã", "mạ"],
        "words": [
            {"word": "Ma", "phoneme": "_1", "canonical": "m a _1", "illustration": "⎯", "guide": "Thanh Ngang: đều đặn bằng phẳng."},
            {"word": "Má", "phoneme": "_5a", "canonical": "m a _5a", "illustration": "↗", "guide": "Thanh Sắc: vút cao dứt khoát."},
            {"word": "Mà", "phoneme": "_2", "canonical": "m a _2", "illustration": "↘", "guide": "Thanh Huyền: trầm nhẹ nhàng."},
            {"word": "Mả", "phoneme": "_4", "canonical": "m a _4", "illustration": "ˀ˥", "guide": "Thanh Hỏi: xuống trầm rồi hất nhẹ."},
            {"word": "Mã", "phoneme": "_3", "canonical": "m a _3", "illustration": "↗̃", "guide": "Thanh Ngã: ngắt hơi ngân cao."},
            {"word": "Mạ", "phoneme": "_6a", "canonical": "m a _6a", "illustration": "ˀ˩", "guide": "Thanh Nặng: nhấn sâu dứt khoát."}
        ],
        "minimal_pairs": [
            {"word1": "mả", "word2": "mã", "focus": "Hỏi vs Ngã"},
            {"word1": "má", "word2": "mạ", "focus": "Sắc vs Nặng"}
        ],
        "sentences": [
            {"sentence": "Ma má mà mả mã mạ.", "canonical": "m a _1 m a _5a m a _2 m a _4 m a _3 m a _6a"}
        ]
    },

    # Level 6: Lesson 10 - Phát âm trong câu tổng hợp
    {
        "id": "lesson-sentences",
        "title": "Bài 10: Thử Thách Phát Âm Trong Câu",
        "level": 6,
        "category": "sentences",
        "category_name": "Phát âm trong câu",
        "difficulty": "Thử thách",
        "duration": "10-12 phút",
        "icon": "📖",
        "description": "Áp dụng tổng hợp phát âm chuẩn âm đầu, âm cuối và dấu thanh trong câu dài và đoạn văn.",
        "target_phonemes": ["S", "s", "ts_", "tS", "l", "n", "N", "_5a", "_3", "_4"],
        "warmup": ["Bé xem sách.", "Xe màu xanh.", "Trăng sáng trên trời."],
        "discrimination_game": {
            "prompt": "Bé đọc sách.",
            "options": ["Bé đọc sách.", "Bé đọc xách."],
            "correct": "Bé đọc sách."
        },
        "mouth_guide": {
            "title": "Phát âm chuẩn từng từ trong câu",
            "tip": "Đọc câu với nhịp điệu tự nhiên, không ngắt quãng giữa các từ, chú ý nhấn rõ các từ mang âm khó (S, TR, Thanh Ngã).",
            "tongue": "Kiểm soát hơi thở đều đặn qua các cụm từ."
        },
        "syllables": ["Bé đọc sách", "Trăng sáng trên trời", "Xe đạp màu xanh"],
        "words": [
            {"word": "Bé đọc sách", "phoneme": "S", "canonical": "b E _5a d O k _6b S a_X k _5b", "illustration": "📖", "guide": "Chú ý uốn lưỡi âm S trong từ 'sách'."},
            {"word": "Xe màu xanh", "phoneme": "s", "canonical": "s E _1 m a w _2 s a_X J _1", "illustration": "🚙", "guide": "Phát âm nhẹ nhàng âm X trong 'xe' và 'xanh'."},
            {"word": "Con mèo ngủ", "phoneme": "_4", "canonical": "k O N _1 m E w _2 n u _4", "illustration": "🐱", "guide": "Thanh hỏi êm ái ở từ 'ngủ'."},
            {"word": "Mặt trời sáng", "phoneme": "ts_", "canonical": "m a_X t _6b ts_ 7_X j _2 S a N _5a", "illustration": "☀️", "guide": "Uốn lưỡi TR trong 'trời' và S trong 'sáng'."}
        ],
        "minimal_pairs": [
            {"word1": "Bé xem sách", "word2": "Bé xem xách", "focus": "Đọc sách (S) vs Xách đồ (X)"}
        ],
        "sentences": [
            {"sentence": "Buổi sáng, Lan đi học nhìn thấy một chú mèo nhỏ.", "canonical": "b uo j _4 S a N _5a l a n _1 d i _1 h O k _6b J i n _2 t_h a_X j _5a m o t _6b tS u _5a m E w _2 J O _4"}
        ]
    }
]
