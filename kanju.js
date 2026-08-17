/**
 * 看剧AI (kanju.ai) TVBox 源 — drpy2 兼容 JS spider
 * 使用方式: 通过 drpy2.js 加载器注入 (TVBox 支持 drpy 的定制版)
 * 说明: kanju.ai 是聚合源, API 需要 HMAC-SHA256 签名; 播放 resolve 接口无需鉴权
 */
var rule = {
    title: '看剧AI',
    host: 'https://kanju.ai',
    // 分类: kind 参数
    class_name: '电影&剧集&动漫&综艺&短剧&纪录片&体育',
    class_url: 'movie&series&anime&variety&short_drama&documentary&sports',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'Referer': 'https://kanju.ai/'
    },
    timeout: 15000,
    // 签名密钥 (从站点 JS 提取)
    SIGN_KEY: '557d0e4ae929f438da6bd84412374e6086b8af09b3fed54bf22601d5bf8c54a0',
    PLAYER_HOST: 'https://player.baipiaozhe.com',

    // ========== 纯 JS HMAC-SHA256 ==========
    sha256: function (ascii) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        var mathPow = Math.pow;
        var maxWord = mathPow(2, 32);
        var result = '';
        var words = [];
        var asciiBitLength = ascii.length * 8;
        var hash = [];
        var k = [];
        var primeCounter = 0;
        var isComposite = {};
        for (var candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (var i = 0; i < 313; i += candidate) isComposite[i] = candidate;
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }
        ascii += '\x80';
        while (ascii.length % 64 - 56) ascii += '\x00';
        for (var i = 0; i < ascii.length; i++) {
            var j = ascii.charCodeAt(i);
            if (j >> 8) return '';
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words.length] = ((asciiBitLength / maxWord) | 0);
        words[words.length] = (asciiBitLength);
        for (var j = 0; j < words.length;) {
            var w = words.slice(j, j += 16);
            var oldHash = hash.slice(0, 8);
            for (var i = 0; i < 64; i++) {
                var w15 = w[i - 15], w2 = w[i - 2];
                var a = hash[0], e = hash[4];
                var temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
                var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
                hash = [(temp1 + temp2) | 0].concat(hash);
                hash[4] = (hash[4] + temp1) | 0;
            }
            for (var i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
        }
        for (var i = 0; i < 8; i++) {
            for (var j = 3; j + 1; j--) {
                var b = (hash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? 0 : '') + b.toString(16);
            }
        }
        return result;
    },
    hmacSha256: function (key, data) {
        var blockSize = 64;
        if (key.length > blockSize) key = this.sha256(key);
        // hex -> 二进制字符串 (内层哈希输出是 32 字节, 不能当 hex 文本拼接)
        function hexToBin(hex) {
            var s = '';
            for (var i = 0; i < hex.length; i += 2)
                s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            return s;
        }
        var kPad = '';
        var iPad = '';
        for (var i = 0; i < blockSize; i++) {
            var kc = i < key.length ? key.charCodeAt(i) : 0;
            kPad += String.fromCharCode(kc ^ 0x5c);
            iPad += String.fromCharCode(kc ^ 0x36);
        }
        return this.sha256(kPad + hexToBin(this.sha256(iPad + data)));
    },

    // ========== 签名请求头 ==========
    signHeaders: function (method, path) {
        var ts = String(Date.now());
        var nonce = '';
        var chars = '0123456789abcdef';
        for (var i = 0; i < 32; i++) nonce += chars[Math.floor(Math.random() * 16)];
        var data = method.toUpperCase() + '\n' + path + '\n' + ts + '\n' + nonce;
        var sig = this.hmacSha256(this.SIGN_KEY, data);
        return {
            'x-ai-movie-timestamp': ts,
            'x-ai-movie-nonce': nonce,
            'x-ai-movie-signature': sig,
            'x-ai-movie-client-name': 'dianyingtiantang-frontend',
            'x-ai-movie-client-version': '1.0.0',
            'x-ai-movie-build-version': 'dianyingtiantang-v2026.08.17.4-cee41b28d97a-b95757794841-cee41b28d97a',
            'x-ai-movie-protocol-version': '2026-07-05.library-v2.playback-v1'
        };
    },
    // kanju.ai API 请求 (自动签名)
    apiGet: async function (path) {
        var headers = this.signHeaders('GET', path);
        var res = request(this.host + path, { headers: headers, method: 'GET' });
        if (res && typeof res.then === 'function') res = await res;
        if (typeof res === 'object' && res !== null) {
            if (typeof res.text === 'function') res = await res.text();
            else res = JSON.stringify(res);
        }
        return JSON.parse(res);
    },

    // ========== TVBox 接口 ==========
    // 首页: 分类 + 最新
    homeContent: async function () {
        var classes = [];
        var names = this.class_name.split('&');
        var urls = this.class_url.split('&');
        for (var i = 0; i < names.length; i++) {
            classes.push({ type_id: urls[i], type_name: names[i] });
        }
        var list = [];
        try {
            var j = await this.apiGet('/v1/browse/catalog?intent=latest_catalog&kind=movie');
            var cards = j.cards || [];
            for (var k = 0; k < cards.length; k++) {
                var c = cards[k];
                list.push({
                    vod_id: c.id,
                    vod_name: c.title,
                    vod_pic: c.poster_url,
                    vod_remarks: (c.year || '') + ' ' + (c.remarks || '')
                });
            }
        } catch (e) { console.log('home err: ' + e.message); }
        return { class: classes, list: list };
    },

    // 分类页
    categoryContent: async function (tid, pg, filter, extend) {
        var list = [];
        var pagecount = 1;
        try {
            var j = await this.apiGet('/v1/browse/catalog?intent=latest_catalog&kind=' + tid + '&page=' + pg);
            var cards = j.cards || [];
            for (var k = 0; k < cards.length; k++) {
                var c = cards[k];
                list.push({
                    vod_id: c.id,
                    vod_name: c.title,
                    vod_pic: c.poster_url,
                    vod_remarks: (c.year || '') + ' ' + (c.remarks || '')
                });
            }
            var pgInfo = j.pagination || {};
            pagecount = pgInfo.total_pages || 1;
        } catch (e) { console.log('category err: ' + e.message); }
        return { page: parseInt(pg), pagecount: pagecount, limit: 20, total: list.length, list: list };
    },

    // 详情
    detailContent: async function (ids) {
        var id = ids[0];
        var detail = {
            vod_id: id,
            vod_name: '',
            vod_pic: '',
            vod_actor: '',
            vod_director: '',
            vod_content: '',
            vod_play_from: '',
            vod_play_url: ''
        };
        try {
            var j = await this.apiGet('/v1/catalog/' + id);
            detail.vod_name = j.title || '';
            detail.vod_pic = j.poster_url || '';
            detail.vod_actor = (j.actors || []).join(',');
            detail.vod_director = (j.directors || []).join(',');
            detail.vod_content = j.description || '';
            var eps = j.episodes || [];
            var urls = [];
            for (var i = 0; i < eps.length; i++) {
                var ep = eps[i];
                var epName = ep.title || ('第' + (i + 1) + '集');
                urls.push(epName + '$' + ep.token);
            }
            var epUrl = urls.join('#');
            // 多线路: 用第一集 token 调 resolve, 提前拿全部线路名
            var lines = [];
            if (eps.length) {
                try {
                    var res2 = request(this.PLAYER_HOST + '/v1/playback/resolve/' + encodeURIComponent(eps[0].token), { method: 'GET' });
                    if (res2 && typeof res2.then === 'function') res2 = await res2;
                    var text2 = typeof res2 === 'object' && res2 && typeof res2.text === 'function' ? await res2.text() : res2;
                    var rj = JSON.parse(text2);
                    var opts = rj.line_options || [];
                    for (var k = 0; k < opts.length; k++) {
                        var nm = opts[k].display_label || opts[k].provider_name;
                        if (nm && lines.indexOf(nm) < 0) lines.push(nm);
                    }
                } catch (e2) { console.log('resolve lines err: ' + e2.message); }
            }
            if (lines.length) {
                // 多线路: 每个线路相同的集列表, 用 $$$ 分隔
                detail.vod_play_from = lines.join('$$$');
                var multi = [];
                for (var k = 0; k < lines.length; k++) multi.push(epUrl);
                detail.vod_play_url = multi.join('$$$');
            } else {
                detail.vod_play_from = '看剧AI';
                detail.vod_play_url = epUrl;
            }
        } catch (e) { console.log('detail err: ' + e.message); }
        return { list: [detail] };
    },

    // 搜索: suggest 接口返回匹配标题
    searchContent: async function (key, quick) {
        var list = [];
        try {
            var j = await this.apiGet('/v1/suggest?q=' + encodeURIComponent(key));
            var sugs = j.suggestions || [];
            for (var i = 0; i < sugs.length; i++) {
                var s = sugs[i];
                if (s.type !== 'title') continue;
                var t = s.target || {};
                if (!t.variant_id) continue;
                list.push({
                    vod_id: t.variant_id,
                    vod_name: t.title || s.label,
                    vod_pic: '',
                    vod_remarks: s.subtitle || ''
                });
            }
        } catch (e) { console.log('search err: ' + e.message); }
        return { list: list };
    },

    // 播放: resolve 拿直链 (无鉴权)
    playerContent: async function (flag, id, vipFlags) {
        var url = '';
        try {
            var res = request(this.PLAYER_HOST + '/v1/playback/resolve/' + encodeURIComponent(id), { method: 'GET' });
            if (res && typeof res.then === 'function') res = await res;
            var text = typeof res === 'object' && res && typeof res.text === 'function' ? await res.text() : res;
            var j = JSON.parse(text);
            // 取线路: flag 匹配 provider_name/display_label, 否则取 selected 线路
            var lines = j.line_options || [];
            var picked = null;
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i];
                if ((l.display_label && l.display_label === flag) || (l.provider_name && l.provider_name === flag)) {
                    picked = l;
                    break;
                }
            }
            if (!picked) {
                for (var i = 0; i < lines.length; i++) {
                    if (lines[i].selected) { picked = lines[i]; break; }
                }
            }
            if (!picked && lines.length) picked = lines[0];
            if (picked) url = picked.url;
        } catch (e) { console.log('player err: ' + e.message); }
        return { parse: 0, playUrl: '', url: url };
    }
};
