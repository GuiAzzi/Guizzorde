exports.jwGenres = [{
    "id": 1,
    "short_name": "act",
    "technical_name": "action",
    "translation": "Action \u0026 Adventure",
    "slug": "action-and-adventure"
},
{
    "id": 2,
    "short_name": "ani",
    "technical_name": "animation",
    "translation": "Animation",
    "slug": "animation"
},
{
    "id": 3,
    "short_name": "cmy",
    "technical_name": "comedy",
    "translation": "Comedy",
    "slug": "comedy"
},
{
    "id": 4,
    "short_name": "crm",
    "technical_name": "crime",
    "translation": "Crime",
    "slug": "crime"
},
{
    "id": 5,
    "short_name": "doc",
    "technical_name": "documentation",
    "translation": "Documentary",
    "slug": "documentary"
},
{
    "id": 6,
    "short_name": "drm",
    "technical_name": "drama",
    "translation": "Drama",
    "slug": "drama"
},
{
    "id": 7,
    "short_name": "fnt",
    "technical_name": "fantasy",
    "translation": "Fantasy",
    "slug": "fantasy"
},
{
    "id": 8,
    "short_name": "hst",
    "technical_name": "history",
    "translation": "History",
    "slug": "history"
},
{
    "id": 9,
    "short_name": "hrr",
    "technical_name": "horror",
    "translation": "Horror",
    "slug": "horror"
},
{
    "id": 10,
    "short_name": "fml",
    "technical_name": "family",
    "translation": "Kids \u0026 Family",
    "slug": "kids-and-family"
},
{
    "id": 11,
    "short_name": "msc",
    "technical_name": "music",
    "translation": "Music \u0026 Musical",
    "slug": "music-and-musical"
}, {
    "id": 12,
    "short_name": "trl",
    "technical_name": "thriller",
    "translation": "Mystery \u0026 Thriller",
    "slug": "mystery-and-thriller"
}, {
    "id": 13,
    "short_name": "rma",
    "technical_name": "romance",
    "translation": "Romance",
    "slug": "romance"
}, {
    "id": 14,
    "short_name": "scf",
    "technical_name": "scifi",
    "translation": "Science-Fiction",
    "slug": "science-fiction"
}, {
    "id": 15,
    "short_name": "spt",
    "technical_name": "sport",
    "translation": "Sport",
    "slug": "sport"
}, {
    "id": 16,
    "short_name": "war",
    "technical_name": "war",
    "translation": "War \u0026 Military",
    "slug": "war-and-military"
}, {
    "id": 17,
    "short_name": "wsn",
    "technical_name": "western",
    "translation": "Western",
    "slug": "western"
}, {
    "id": 23,
    "short_name": "rly",
    "technical_name": "reality",
    "translation": "Reality TV",
    "slug": "reality-tv"
}, {
    "id": 18,
    "short_name": "eur",
    "technical_name": "european",
    "translation": "Made in Europe",
    "slug": "made-in-europe"
}
]

exports.jwProviders = [{
    "id": 8,
    "technical_name": "netflix",
    "short_name": "nfx",
    "clear_name": "Netflix",
    "priority": 10,
    "display_priority": 1,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/207360008/{profile}",
    "icon_blur_hash": "KVBJXFjt1^jto1a|A;a|,Z",
    "slug": "netflix",
    "data": {
        "deeplink_data": [{
            "scheme": "https",
            "packages": ["com.netflix.ninja", "com.netflix.mediaclient", "com.netflix"],
            "platforms": ["fire_tv", "android_tv", "tvos"],
            "path_template": "www.netflix.com/watch/%DEEPLINK%",
            "extras": {
                "S.source": "30"
            }
        }],
        "packages": {
            "android_tv": "com.netflix.ninja",
            "fire_tv": "com.netflix.ninja",
            "tvos": "com.netflix.ninja",
            "tizenos": "",
            "webos": ""
        }
    }
},
{
    "id": 167,
    "technical_name": "clarovideo",
    "short_name": "clv",
    "clear_name": "Claro video",
    "priority": 5,
    "display_priority": 2,
    "monetization_types": ["free", "rent", "flatrate"],
    "icon_url": "/icon/9899714/{profile}",
    "icon_blur_hash": "KPRo,4-pt,?HWBRj*JR*R5",
    "slug": "claro-video",
    "data": {
        "deeplink_data": [{
            "scheme": "",
            "packages": ["claro"],
            "platforms": ["tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "claro",
            "tizenos": "",
            "webos": ""
        }
    }
},
{
    "id": 119,
    "technical_name": "amazonprimevideo",
    "short_name": "prv",
    "clear_name": "Amazon Prime Video",
    "priority": 5,
    "display_priority": 3,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/52449861/{profile}",
    "icon_blur_hash": "KMQAQ@%M~Ux]WCjF~qj[IU",
    "slug": "amazon-prime-video",
    "data": {
        "deeplink_data": [{
            "scheme": "https",
            "packages": ["com.amazon.avod"],
            "platforms": ["fire_tv"],
            "path_template": "watch.amazon.de/watch?asin=%DEEPLINK%\u0026contentType=MOVIE\u0026territory=DE\u0026ref_=atv_dp_pb_core",
            "extras": null
        }, {
            "scheme": "",
            "packages": ["com.amazon.amazonvideo.livingroom"],
            "platforms": ["android_tv"],
            "path_template": "",
            "extras": {
                "S.com.amazon.ignition.DeepLinkIntent.DEEP_LINK": "%DEEPLINK%"
            }
        }, {
            "scheme": "",
            "packages": ["aiv"],
            "platforms": ["tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "com.amazon.amazonvideo.livingroom",
            "fire_tv": "com.amazon.avod",
            "tvos": "aiv",
            "tizenos": "",
            "webos": ""
        }
    }
},
{
    "id": 47,
    "technical_name": "looke",
    "short_name": "lke",
    "clear_name": "Looke",
    "priority": 5,
    "display_priority": 4,
    "monetization_types": ["rent", "buy", "flatrate"],
    "icon_url": "/icon/755940/{profile}",
    "icon_blur_hash": "KW7e=Mj]Muflj[j?Dgayxu",
    "slug": "looke",
    "data": {
        "deeplink_data": [{
            "scheme": "",
            "packages": ["hello_world"],
            "platforms": ["android_tv"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "hello_world",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
},
{
    "id": 31,
    "technical_name": "hbogo",
    "short_name": "hbg",
    "clear_name": "HBO Go",
    "priority": 5,
    "display_priority": 5,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/614494/{profile}",
    "icon_blur_hash": "KLCGfHax4T.7azM|4mj[%g",
    "slug": "hbo-go",
    "data": {
        "deeplink_data": [{
            "scheme": "hbogo",
            "packages": ["com.hbo.go"],
            "platforms": ["android_tv", "fire_tv"],
            "path_template": "%DEEPLINK%",
            "extras": null
        }, {
            "scheme": "",
            "packages": ["com.hbogo"],
            "platforms": ["tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "com.hbo.go",
            "fire_tv": "com.hbo.go",
            "tvos": "com.hbogo",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 2,
    "technical_name": "itunes",
    "short_name": "itu",
    "clear_name": "Apple iTunes",
    "priority": 5,
    "display_priority": 6,
    "monetization_types": ["rent", "buy"],
    "icon_url": "/icon/190848813/{profile}",
    "icon_blur_hash": "KSA^OK%MIUoffQay00M{%M",
    "slug": "apple-itunes",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 350,
    "technical_name": "appletvplus",
    "short_name": "atp",
    "clear_name": "Apple TV Plus",
    "priority": 5,
    "display_priority": 7,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/152862153/{profile}",
    "icon_blur_hash": "KH7w?1%MIUj[j[ay00IUxu",
    "slug": "apple-tv-plus",
    "data": {
        "deeplink_data": [{
            "scheme": "",
            "packages": ["nice"],
            "platforms": ["tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "nice",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 227,
    "technical_name": "telecineplay",
    "short_name": "tcp",
    "clear_name": "Telecine Play",
    "priority": 5,
    "display_priority": 8,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/176934433/{profile}",
    "icon_blur_hash": "KXR{cAt7%gXmayni?^WBMx",
    "slug": "telecine-play",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 307,
    "technical_name": "globoplay",
    "short_name": "gop",
    "clear_name": "Globo Play",
    "priority": 5,
    "display_priority": 9,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/136871678/{profile}",
    "icon_blur_hash": "KXSn]PxGqGxGa|WVqaWVoL",
    "slug": "globo-play",
    "data": {
        "deeplink_data": [{
            "scheme": "",
            "packages": ["globoplay"],
            "platforms": ["android_tv", "tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "globoplay",
            "fire_tv": "",
            "tvos": "globoplay",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 229,
    "technical_name": "foxplay",
    "short_name": "fpl",
    "clear_name": "Fox Play",
    "priority": 5,
    "display_priority": 10,
    "monetization_types": ["ads", "flatrate"],
    "icon_url": "/icon/92517046/{profile}",
    "icon_blur_hash": "KVS_o5s:qat7fkaeqGjZY5",
    "slug": "fox-play",
    "data": {
        "deeplink_data": [{
            "scheme": "",
            "packages": ["foxplay"],
            "platforms": ["tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "foxplay",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 228,
    "technical_name": "foxpremium",
    "short_name": "fpr",
    "clear_name": "Fox Premium",
    "priority": 5,
    "display_priority": 11,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/92161259/{profile}",
    "icon_blur_hash": "KcR]yjxsiIrFj[bbY+e.gh",
    "slug": "fox-premium",
    "data": {
        "deeplink_data": [{
            "scheme": "",
            "packages": ["foxpremium"],
            "platforms": ["tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "foxpremium",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 3,
    "technical_name": "play",
    "short_name": "ply",
    "clear_name": "Google Play Movies",
    "priority": 4,
    "display_priority": 12,
    "monetization_types": ["rent", "buy"],
    "icon_url": "/icon/169478387/{profile}",
    "icon_blur_hash": "KSQ,j#Ac~XK#JB$S%MxBMe",
    "slug": "google-play-movies",
    "data": {
        "deeplink_data": [{
            "scheme": "https",
            "packages": ["com.google.android.videos"],
            "platforms": ["android_tv", "fire_tv"],
            "path_template": "www.youtube.com/watch?v=%DEEPLINK%",
            "extras": null
        }],
        "packages": {
            "android_tv": "com.google.android.videos",
            "fire_tv": "com.google.android.videos",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 19,
    "technical_name": "netmovies",
    "short_name": "ntm",
    "clear_name": "NetMovies",
    "priority": 5,
    "display_priority": 13,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/446738/{profile}",
    "icon_blur_hash": "KWJQBbWB4U?0aysX8yof.7",
    "slug": "netmovies",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 68,
    "technical_name": "microsoft",
    "short_name": "msf",
    "clear_name": "Microsoft Store",
    "priority": 5,
    "display_priority": 14,
    "monetization_types": ["buy", "rent"],
    "icon_url": "/icon/820542/{profile}",
    "icon_blur_hash": "KYDBUIof0NWFjuWC4qWC?Y",
    "slug": "microsoft-store",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 11,
    "technical_name": "mubi",
    "short_name": "mbi",
    "clear_name": "Mubi",
    "priority": 11,
    "display_priority": 15,
    "monetization_types": ["flatrate", "rent"],
    "icon_url": "/icon/164970114/{profile}",
    "icon_blur_hash": "KF5rQpoiRib2axj@9DWCt7",
    "slug": "mubi",
    "data": {
        "deeplink_data": [{
            "scheme": "",
            "packages": ["mubi"],
            "platforms": ["fire_tv", "android_tv", "tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "mubi",
            "fire_tv": "mubi",
            "tvos": "mubi",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 283,
    "technical_name": "crunchyroll",
    "short_name": "cru",
    "clear_name": "Crunchyroll",
    "priority": 5,
    "display_priority": 16,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/127445869/{profile}",
    "icon_blur_hash": "KjSD4wozQRn$kCj]UvaKpJ",
    "slug": "crunchyroll",
    "data": {
        "deeplink_data": [{
            "scheme": "",
            "packages": ["crunchyroll"],
            "platforms": ["fire_tv", "android_tv", "tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "crunchyroll",
            "fire_tv": "crunchyroll",
            "tvos": "crunchyroll",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 190,
    "technical_name": "curiositystream",
    "short_name": "cts",
    "clear_name": "Curiosity Stream",
    "priority": 5,
    "display_priority": 17,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/48600036/{profile}",
    "icon_blur_hash": "KjS#6LoeiHn#fQkCU[f6em",
    "slug": "curiosity-stream",
    "data": {
        "deeplink_data": [{
            "scheme": "",
            "packages": ["curiositystream"],
            "platforms": ["android_tv", "fire_tv", "tvos"],
            "path_template": "",
            "extras": null
        }],
        "packages": {
            "android_tv": "curiositystream",
            "fire_tv": "curiositystream",
            "tvos": "curiositystream",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 464,
    "technical_name": "kocowa",
    "short_name": "koc",
    "clear_name": "Kocowa",
    "priority": 5,
    "display_priority": 100,
    "monetization_types": ["flatrate", "ads"],
    "icon_url": "/icon/207331738/{profile}",
    "icon_blur_hash": "KF8E3xxvRkxvogf900WCt7",
    "slug": "kocowa",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 447,
    "technical_name": "belasartesalacarte",
    "short_name": "bac",
    "clear_name": "Belas Artes à La Carte",
    "priority": 5,
    "display_priority": 100,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/202326287/{profile}",
    "icon_blur_hash": "KJCXjCbH66JTa|a|1zoKw^",
    "slug": "belas-artes-a-la-carte",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 465,
    "technical_name": "believe",
    "short_name": "bli",
    "clear_name": "Believe",
    "priority": 5,
    "display_priority": 100,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/207957738/{profile}",
    "icon_blur_hash": "KHPLgDN{HX-7jvkWL~aeu4",
    "slug": "believe",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 462,
    "technical_name": "vidplus",
    "short_name": "vid",
    "clear_name": "Vid Plus",
    "priority": 5,
    "display_priority": 100,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/207331558/{profile}",
    "icon_blur_hash": "KD8XdrteH_-paxkC8$RC%c",
    "slug": "vid-plus",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 457,
    "technical_name": "vixtv",
    "short_name": "vix",
    "clear_name": "VIX ",
    "priority": 5,
    "display_priority": 101,
    "monetization_types": ["ads"],
    "icon_url": "/icon/202926990/{profile}",
    "icon_blur_hash": "KI9QmxayIUofj[ay00j]%M",
    "slug": "vix",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 512,
    "technical_name": "tntgo",
    "short_name": "tgo",
    "clear_name": "TNTGo",
    "priority": 5,
    "display_priority": 1000,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/209565607/{profile}",
    "icon_blur_hash": "KH8MN_soNaoLjta|1HS2xG",
    "slug": "tntgo",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 473,
    "technical_name": "revry",
    "short_name": "rvy",
    "clear_name": "Revry",
    "priority": 5,
    "display_priority": 1000,
    "monetization_types": ["flatrate", "ads"],
    "icon_url": "/icon/208144706/{profile}",
    "icon_blur_hash": "KI8Mans;NYspjaa{0_R*xH",
    "slug": "revry",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 475,
    "technical_name": "docsville",
    "short_name": "dsv",
    "clear_name": "DOCSVILLE",
    "priority": 5,
    "display_priority": 1000,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/208148387/{profile}",
    "icon_blur_hash": "KFS=u7xuuPxuj[bHuOaenj",
    "slug": "docsville",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 477,
    "technical_name": "gospelplay",
    "short_name": "gos",
    "clear_name": "GOSPEL PLAY",
    "priority": 5,
    "display_priority": 1000,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/208171655/{profile}",
    "icon_blur_hash": "KUELyxV@M|b_t7Rj0LkCof",
    "slug": "gospel-play",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 478,
    "technical_name": "historyplay",
    "short_name": "hpl",
    "clear_name": "History Play",
    "priority": 5,
    "display_priority": 1000,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/208172686/{profile}",
    "icon_blur_hash": "KRC~34WC0$xsa|Rl5Aoe-T",
    "slug": "history-play",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 484,
    "technical_name": "nowonline",
    "short_name": "now",
    "clear_name": "NOW",
    "priority": 5,
    "display_priority": 1000,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/208853791/{profile}",
    "icon_blur_hash": "KF9tDee.IUxtjZRk00kCxu",
    "slug": "now",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 490,
    "technical_name": "arte1play",
    "short_name": "arp",
    "clear_name": "Arte1 Play ",
    "priority": 5,
    "display_priority": 1000,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/208860849/{profile}",
    "icon_blur_hash": "KUMg*pt6MdxuWBV@8wV@tl",
    "slug": "arte1-play",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 495,
    "technical_name": "cgoodtv",
    "short_name": "cgt",
    "clear_name": "CGood TV",
    "priority": 5,
    "display_priority": 1000,
    "monetization_types": ["free"],
    "icon_url": "/icon/208864843/{profile}",
    "icon_blur_hash": "KARbbt-_hg-wjbnOhfnOaK",
    "slug": "cgood-tv",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 499,
    "technical_name": "oldflix",
    "short_name": "ofx",
    "clear_name": "Oldflix",
    "priority": 5,
    "display_priority": 1000,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/209544344/{profile}",
    "icon_blur_hash": "KjNdamR*^+t7azs-~pM|M{",
    "slug": "oldflix",
    "data": {
        "deeplink_data": [],
        "packages": {
            "android_tv": "",
            "fire_tv": "",
            "tvos": "",
            "tizenos": "",
            "webos": ""
        }
    }
}, {
    "id": 337,
    "technical_name": "disneyplus",
    "short_name": "dnp",
    "clear_name": "Disney Plus",
    "priority": 5,
    "display_priority": 1001,
    "monetization_types": ["flatrate"],
    "icon_url": "/icon/147638351/{profile}",
    "icon_blur_hash": "KQ5=;uogRNR1f5ohIUWBt6",
    "slug": "disney-plus",
    "data": {
        "deeplink_data": [{
            "scheme": "https",
            "packages": ["com.disney.disneyplus"],
            "platforms": ["android_tv"],
            "path_template": "disneyplus.com/%DEEPLINK%",
            "extras": null
        }, {
            "scheme": "",
            "packages": ["com.disneyplus"],
            "platforms": ["tvos"],
            "path_template": "",
            "extras": null
        }, {
            "scheme": "https",
            "packages": ["com.disney.disneyplus"],
            "platforms": ["fire_tv"],
            "path_template": "disneyplus.com/%DEEPLINK%",
            "extras": null
        }],
        "packages": {
            "android_tv": "com.disney.disneyplus",
            "fire_tv": "com.disney.disneyplus",
            "tvos": "com.disneyplus",
            "tizenos": "",
            "webos": ""
        }
    }
}
]

