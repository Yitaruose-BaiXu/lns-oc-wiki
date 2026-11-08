/*! ==========================================================================
 * 凉凝霜的 OC 档案库 · 交互脚本 site.js
 * --------------------------------------------------------------------------
 * 功能一览（都不需要改 HTML 结构即可生效）：
 *   1. 卡片自动拆分「星级」与「名称」，按星级上色
 *   2. 顶部导航 / 子标签自动高亮当前页面
 *   3. 图片位：[data-tu] 自动加载图片（支持自动补 .jpg/.png/.webp 后缀）
 *      - 卡片 .kapian 会按链接地址自动找 img/ 下的同名图片作为缩略图
 *      - 图片缺失时显示虚线占位框，不会撑破排版
 *   4. 点击图片打开灯箱大图：Esc 关闭、← → 切换
 *   5. 滚动渐显、返回顶部
 * --------------------------------------------------------------------------
 * 加图片最省事的办法：把图片按页面路径放进 img/ 文件夹，例如
 *   角色：img/jueseku/liangningshuang.jpg  → 角色列表卡片 + 角色页自动显示
 *   武器：img/wuqi/cangfeng.png
 *   圣遗物：img/shengyiwu/yuanjieyiyulu.webp
 * 页面里的图片位则写：<figure class="tupian tupian-gao" data-tu="img/xxx"></figure>
 * ========================================================================== */
(function () {
    'use strict';

    var d = document;
    var root = d.documentElement;
    root.classList.add('js');

    var IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

    /* 需要高亮的专有名词（技能 / 状态 / 反应名）——想增减直接改这个数组 */
    var OC_TERMS = [
        /* 凉凝霜 */
        '墨落之间',
        '飘若浮云',
        '绘色笔',
        '江寒墨域',
        '江寒坠梦',
        '池鱼黑染',
        '执笔落墨梅',
        '执笔墨落梅',
        '辉映•星烁',
        '辉映•星超导',
        '辉映•星扩散',
        '星烁反应',
        '星扩散反应',
        '星超导反应',
        /* 白戌 */
        '辰白',
        '影幻',
        '幻变千色',
        '幻梦之伤',
        '风切变式•改',
        '风切变式',
        '流幻灭',
        '虚实之泪',
        '影穗',
        /* 汐星 */
        '无欢度',
        '汐海语',
        '末法星',
        '星隧箭',
        '星持灵镜',
        '汐海之剑',
        '极念•汐浪剑罚',
        '晓浪•星明刻印',
        /* 枫明 */
        '溯溪•泯燃',
        '暮霞•秋火流',
        '寒秋叶落，霜冬燃枫',
        '暮霞',
        '秋火',
        '刻印',
        /* 华浮初明 */
        '彩绸剪裁影',
        '彩缎庇护',
        '霄云灯',
        '彩绸',
        '点灯',
        /* 柯雨玄 */
        '旧国字文•玖型体',
        '寰色•月夜初升',
        '震方•玖泽灰',
        '篆符•誓词使',
        '霖月护盾',
        '旧国字文',
        '月兆•初辉',
        '月兆•满辉',
        '月兆',
        /* 云烟 */
        '风起云涌•注连',
        '真空季•凌寒',
        '烟刺护盾',
        '•寒音切',
        '•萧声鸣',
        '寒音切',
        '萧声鸣',
        '积云',
        '凝烟',
        '奇点',
        /* 带圆点的攻击词：只命中原文里带「•」的那几处 */
        '•普通攻击',
        '•重击',
        '•下落攻击'
    ];

    /* 元素专属术语：按元素分组，key 对应 .gejianN（1风 2岩 3雷 4草 5水 6火 7冰）
       把「属性名词」写进对应数组即可自动上该元素的颜色 */
    var OC_ELEMENT_TERMS = {
        feng: ['风元素', '范围风元素伤害', '风元素伤害', '风元素范围伤害', '风元素附魔'],
        yan:  ['岩元素', '范围岩元素伤害', '岩元素伤害', '岩元素范围伤害', '岩元素附魔'],
        lei:  ['雷元素', '范围雷元素伤害', '雷元素伤害', '雷元素范围伤害', '雷元素附魔'],
        cao:  ['草元素', '范围草元素伤害', '草元素伤害', '草元素范围伤害', '草元素附魔'],
        shui: ['水元素', '范围水元素伤害', '水元素伤害', '水元素范围伤害', '水元素附魔'],
        huo:  ['火元素', '范围火元素伤害', '火元素伤害', '火元素范围伤害', '火元素附魔'],
        bing: ['冰元素', '范围冰元素伤害', '冰元素伤害', '冰元素范围伤害', '冰元素附魔']
    };

    /* ------------------------------ 小工具 ------------------------------ */
    function all(selector, ctx) {
        return Array.prototype.slice.call((ctx || d).querySelectorAll(selector));
    }

    function make(tag, className, text) {
        var el = d.createElement(tag);
        if (className) { el.className = className; }
        if (text !== undefined && text !== null) { el.textContent = text; }
        return el;
    }

    function urlsFromBase(base) {
        if (!base) { return []; }
        base = String(base).trim();
        if (!base) { return []; }
        if (/\.(jpe?g|png|webp|gif|avif|svg)$/i.test(base)) { return [base]; }
        return IMG_EXT.map(function (ext) { return base + ext; });
    }

    /* 逐个尝试候选地址，命中即回调 */
    function probe(urls, done, fail) {
        var i = 0;
        function next() {
            if (i >= urls.length) {
                if (fail) { fail(); }
                return;
            }
            var url = urls[i];
            var img = new Image();
            i += 1;
            img.onload = function () { done(url, img); };
            img.onerror = next;
            img.src = url;
        }
        next();
    }

    /* 元素进入视口附近后再去试图片，避免一次发太多请求 */
    function whenVisible(el, fn) {
        if (!('IntersectionObserver' in window)) {
            fn();
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    io.disconnect();
                    fn();
                }
            });
        }, { rootMargin: '300px 0px' });
        io.observe(el);
    }

    /* ------------------------- 1. 卡片：星级 + 名称 ------------------------- */
    function setupCards() {
        all('.gezi > div').forEach(function (card) {
            if (card.classList.contains('konggezi')) { return; }

            var link = card.querySelector('a');
            if (!link) { return; }
            card.classList.add('kapian');

            var text = (link.textContent || '').replace(/\s+/g, ' ').trim();
            var matched = text.match(/^([0-9０-９?？])\s*★\s*[┃|｜]?\s*(.*)$/);
            if (matched) {
                var star = matched[1];
                if (star === '?' || star === '？') {
                    star = 'q';
                } else {
                    star = star.replace(/[０-９]/, function (ch) {
                        return String.fromCharCode(ch.charCodeAt(0) - 65248);
                    });
                }
                card.classList.add('x-' + star);

                while (link.firstChild) { link.removeChild(link.firstChild); }
                link.appendChild(make('span', 'xing', matched[1] + '★'));
                link.appendChild(make('span', 'ming', matched[2].trim()));
            }

            /* 缩略图：优先 data-tu；否则按链接地址推断 img/ 下的同名文件 */
            var urls = urlsFromBase(card.getAttribute('data-tu'));
            var href = link.getAttribute('href') || '';
            if (!urls.length && href && !/^(https?:|#|javascript:|mailto:)/i.test(href)) {
                var guessed = href
                    .replace(/^\.\/+/, '')
                    .replace(/\.html?$/i, '');
                urls = urlsFromBase('img/' + guessed);
            }
            if (!urls.length) { return; }

            whenVisible(card, function () {
                probe(urls, function (url) {
                    card.style.setProperty('--tu', 'url("' + url + '")');
                    card.classList.add('you-tu');
                });
            });
        });
    }

    /* ----------------------- 2. 导航 / 子标签高亮 ----------------------- */
    function currentPath() {
        var path;
        try {
            path = decodeURIComponent(location.pathname);
        } catch (err) {
            path = location.pathname;
        }
        path = path.toLowerCase();
        if (!path || path.slice(-1) === '/') { path += 'index.html'; }
        return path.replace(/\/+$/, '');
    }

    function resolvedPath(href) {
        try {
            return decodeURIComponent(new URL(href, location.href).pathname).toLowerCase();
        } catch (err) {
            return '';
        }
    }

    function setupNav() {
        var here = currentPath();
        var navLinks = all('.daohang a');
        var matched = null;

        navLinks.forEach(function (link) {
            if (resolvedPath(link.getAttribute('href')) === here) {
                link.classList.add('on');
                link.setAttribute('aria-current', 'page');
                matched = link;
            }
        });

        /* 详情页没有同名导航项时，按所在文件夹点亮所属栏目 */
        if (!matched && navLinks.length) {
            var sections = ['jueseku', 'wuqi', 'shengyiwu', 'wupin', 'chengjiu'];
            var parts = here.split('/');
            for (var i = 0; i < sections.length; i += 1) {
                if (parts.indexOf(sections[i]) !== -1) {
                    var target = navLinks[i];
                    if (target) {
                        target.classList.add('on');
                        target.setAttribute('aria-current', 'page');
                    }
                    break;
                }
            }
        }

        all('.konggezi a').forEach(function (link) {
            if (resolvedPath(link.getAttribute('href')) === here) {
                var box = link.closest('.konggezi') || link.parentNode;
                if (box) { box.classList.add('on'); }
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    /* ------------------------------ 3. 图片位 ------------------------------ */
    var gallery = [];
    var box = null;
    var boxImg = null;
    var boxCap = null;
    var boxIndex = 0;

    function addCaption(fig, text) {
        if (!text) { return; }
        var cap = fig.querySelector('figcaption');
        if (!cap) {
            cap = make('figcaption');
            fig.appendChild(cap);
        }
        cap.textContent = text;
    }

    function showPlaceholder(fig, urls, img) {
        if (img) {
            img.style.display = 'none';
        }
        var cap = fig.querySelector('figcaption');
        if (cap) { cap.style.display = 'none'; }
        fig.classList.add('kong');
        if (fig.querySelector('.tishi')) { return; }
        fig.appendChild(make('span', 'tishi', fig.getAttribute('data-kong') || '图片位 · 待添加'));
        if (urls && urls.length) {
            fig.appendChild(make('small', null, urls[0]));
        }
    }

    function bindZoom(img, fig, caption) {
        var item = {
            src: img.currentSrc || img.getAttribute('src') || '',
            cap: caption || ''
        };
        gallery.push(item);
        img.addEventListener('click', function () {
            openLightbox(item);
        });
    }

    function setupImages() {
        all('.tupian').forEach(function (fig) {
            var caption = fig.getAttribute('data-shuoming') || fig.getAttribute('data-alt') || '';
            var urls = urlsFromBase(fig.getAttribute('data-tu'));
            var img = fig.querySelector('img');

            if (img) {
                if (!caption) { caption = img.getAttribute('alt') || ''; }
                bindZoom(img, fig, caption);
                addCaption(fig, caption);
                img.addEventListener('error', function () {
                    showPlaceholder(fig, urls.length ? urls : [img.getAttribute('src')], img);
                }, { once: true });
                return;
            }

            if (!urls.length) {
                showPlaceholder(fig, [], null);
                return;
            }

            whenVisible(fig, function () {
                probe(urls, function (url) {
                    var pic = make('img');
                    pic.alt = caption || '图片';
                    pic.loading = 'lazy';
                    pic.decoding = 'async';
                    pic.src = url;
                    fig.appendChild(pic);
                    fig.classList.remove('kong');
                    addCaption(fig, caption);
                    bindZoom(pic, fig, caption);
                }, function () {
                    showPlaceholder(fig, urls, null);
                });
            });
        });
    }

    /* ------------------------------ 4. 灯箱 ------------------------------ */
    function stepLightbox(delta) {
        if (gallery.length < 2) { return; }
        boxIndex = (boxIndex + delta + gallery.length) % gallery.length;
        renderLightbox();
    }

    function renderLightbox() {
        var item = gallery[boxIndex];
        if (!item) { return; }
        boxImg.src = item.src;
        boxImg.alt = item.cap || '大图';
        boxCap.textContent = item.cap || '';
        boxCap.style.display = item.cap ? '' : 'none';
        box.classList.toggle('jiyi', gallery.length < 2);
    }

    function openLightbox(item) {
        if (!box) { buildLightbox(); }
        boxIndex = gallery.indexOf(item);
        if (boxIndex < 0) { boxIndex = 0; }
        renderLightbox();
        d.body.style.overflow = 'hidden';
        box.classList.add('on');
        var closeBtn = box.querySelector('.guanbi');
        if (closeBtn) { closeBtn.focus(); }
    }

    function closeLightbox() {
        if (!box) { return; }
        box.classList.remove('on');
        d.body.style.overflow = '';
    }

    function buildLightbox() {
        box = make('div', 'dengxiang');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.setAttribute('aria-label', '查看大图');

        var fig = make('figure');
        boxImg = make('img');
        boxCap = make('figcaption');
        fig.appendChild(boxImg);
        fig.appendChild(boxCap);

        var closeBtn = make('button', 'guanbi', '✕');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', '关闭大图');

        var prevBtn = make('button', 'shangyi', '‹');
        prevBtn.type = 'button';
        prevBtn.setAttribute('aria-label', '上一张');

        var nextBtn = make('button', 'xiayi', '›');
        nextBtn.type = 'button';
        nextBtn.setAttribute('aria-label', '下一张');

        box.appendChild(fig);
        box.appendChild(closeBtn);
        box.appendChild(prevBtn);
        box.appendChild(nextBtn);
        d.body.appendChild(box);

        closeBtn.addEventListener('click', closeLightbox);
        prevBtn.addEventListener('click', function () { stepLightbox(-1); });
        nextBtn.addEventListener('click', function () { stepLightbox(1); });
        box.addEventListener('click', function (event) {
            if (event.target === box) { closeLightbox(); }
        });

        d.addEventListener('keydown', function (event) {
            if (!box.classList.contains('on')) { return; }
            if (event.key === 'Escape') {
                closeLightbox();
            } else if (event.key === 'ArrowLeft') {
                stepLightbox(-1);
            } else if (event.key === 'ArrowRight') {
                stepLightbox(1);
            }
        });
    }

    /* ------------------------------ 5. 返回顶部 ------------------------------ */
    function setupBackToTop() {
        var btn = make('button', 'huidingbu', '↑');
        btn.type = 'button';
        btn.setAttribute('aria-label', '返回顶部');
        d.body.appendChild(btn);

        var ticking = false;
        function update() {
            var y = window.pageYOffset || root.scrollTop || 0;
            btn.classList.toggle('on', y > 420);
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }, { passive: true });
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        update();
    }

    /* ------------------------------ 6. 渐显 ------------------------------ */
    function setupReveal() {
        var items = all('.gezi, .jieshao');
        if (!('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('xian'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('xian');
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -4% 0px' });

        items.forEach(function (el) { io.observe(el); });

        /* 兜底：万一观察器没有触发，1.2 秒后全部复位 */
        window.setTimeout(function () {
            items.forEach(function (el) { el.classList.add('xian'); });
        }, 1200);
    }

    /* ------------------- 7. 大段说明文字：降为正文排版 ------------------- */
    function setupLongBlocks() {
        all('.jichuxingxi').forEach(function (block) {
            if (block.classList.contains('changwen')) { return; }
            var head = block.querySelector('h3');
            if (!head) { return; }
            var length = (head.textContent || '').replace(/\s+/g, '').length;
            /* 长文（武器介绍、圣遗物套装效果等）不再整段用标题字号 */
            if (length > 60) { block.classList.add('changwen'); }
        });
    }

    /* ------------------- 8. 基础数值卡：数据变成小胶囊 ------------------- */
    function linesOf(el) {
        return el.innerHTML.split(/<br\s*\/?>/i).map(function (chunk) {
            var tmp = d.createElement('div');
            tmp.innerHTML = chunk;
            return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
        }).filter(function (line) { return line !== ''; });
    }

    function isChipLines(lines, requireColon) {
        if (lines.length < 2) { return false; }
        var colon = 0;
        var ok = lines.every(function (line) {
            if (line.length > 26) { return false; }
            if (/[。！；]/.test(line)) { return false; }
            if (/[：:]/.test(line)) { colon += 1; }
            return true;
        });
        if (!ok) { return false; }
        return requireColon ? colon >= 1 : true;
    }

    function setupStatPanels() {
        all('.jieshao').forEach(function (card) {
            if (card.querySelector('.jineng')) { return; }

            var blocks = Array.prototype.filter.call(card.children, function (el) {
                return el.classList && el.classList.contains('jichuxingxi');
            });
            if (!blocks.length || blocks.length > 2) { return; }

            var targets = [];
            var usable = blocks.every(function (block, index) {
                var head = block.querySelector('h3, h4');
                if (!head) { return false; }
                var lines = linesOf(head);
                /* 只有「纯数据」块才转换：短行、无句号，最后一块必须带冒号键值 */
                if (!isChipLines(lines, index === blocks.length - 1)) { return false; }
                targets.push({ head: head, lines: lines });
                return true;
            });
            if (!usable) { return; }

            card.classList.add('shuxingban');
            targets.forEach(function (target) {
                var head = target.head;
                head.textContent = '';
                target.lines.forEach(function (line) {
                    var chip = make('span', 'shuxing');
                    var pair = line.match(/^([^：:]{1,10})[：:]\s*(.+)$/);
                    if (pair) {
                        chip.appendChild(make('i', null, pair[1]));
                        chip.appendChild(make('b', null, pair[2]));
                    } else {
                        chip.appendChild(make('b', null, line));
                    }
                    head.appendChild(chip);
                });
            });
        });
    }

    /* ------------- 9. 武器精炼数值：x/x/x/x/x 按武器星级上色 ------------- */
    function makeRefineRun(run) {
        var wrap = make('span', 'jl-run');
        var parts = run.split(/(\s*\/\s*)/);
        var rank = 0;
        parts.forEach(function (part) {
            if (!part) { return; }
            if (/^\s*\/\s*$/.test(part)) {
                wrap.appendChild(d.createTextNode('/'));
                return;
            }
            rank += 1;
            wrap.appendChild(make('span', 'jl-v jl-' + Math.min(rank, 5), part));
        });
        return wrap;
    }

    function setupRefineValues() {
        var xing = d.body.getAttribute('data-xing');
        if (!xing) { return; }

        /* 五段式：4%/6%/8%/10%/12% 或 80/100/120/140/160 */
        var RUN = /(?<![\d.\/%])(\d+(?:\.\d+)?%?(?:\s*\/\s*\d+(?:\.\d+)?%?){4})(?![\d\/%])/g;

        all('.jineng, .jichuxingxi').forEach(function (box) {
            var walker = d.createTreeWalker(box, NodeFilter.SHOW_TEXT, null);
            var textNodes = [];
            while (walker.nextNode()) { textNodes.push(walker.currentNode); }

            textNodes.forEach(function (node) {
                var text = node.nodeValue;
                if (!text || text.indexOf('/') === -1) { return; }
                var parent = node.parentNode;
                if (!parent || /^(SCRIPT|STYLE)$/.test(parent.nodeName)) { return; }
                if (parent.closest && parent.closest('.jl-run')) { return; }

                RUN.lastIndex = 0;
                if (!RUN.test(text)) { return; }
                RUN.lastIndex = 0;

                var frag = d.createDocumentFragment();
                var last = 0;
                var m;
                while ((m = RUN.exec(text)) !== null) {
                    if (m.index > last) {
                        frag.appendChild(d.createTextNode(text.slice(last, m.index)));
                    }
                    frag.appendChild(makeRefineRun(m[1]));
                    last = m.index + m[0].length;
                }
                if (last < text.length) {
                    frag.appendChild(d.createTextNode(text.slice(last)));
                }
                parent.replaceChild(frag, node);
            });
        });
    }

    /* ---------------- 10. 专有名词高亮（技能 / 状态名） ---------------- */
    function normalizeTerm(term) {
        return term.replace(/[·・]/g, '•');
    }

    function setupTerms() {
        var list = OC_TERMS.slice();
        var elemOf = {};

        Object.keys(OC_ELEMENT_TERMS).forEach(function (key) {
            OC_ELEMENT_TERMS[key].forEach(function (term) {
                list.push(term);
                elemOf[normalizeTerm(term)] = key;
            });
        });
        if (!list.length) { return; }

        var pattern = list
            .slice()
            .sort(function (a, b) { return b.length - a.length; })
            .map(function (term) {
                return term
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/[•·]/g, '[•·・]');
            })
            .join('|');
        var TERM = new RegExp(pattern, 'g');

        all('.jichuxingxi, .jineng').forEach(function (box) {
            var walker = d.createTreeWalker(box, NodeFilter.SHOW_TEXT, null);
            var textNodes = [];
            while (walker.nextNode()) { textNodes.push(walker.currentNode); }

            textNodes.forEach(function (node) {
                var text = node.nodeValue;
                if (!text) { return; }
                var parent = node.parentNode;
                if (!parent || /^(SCRIPT|STYLE)$/.test(parent.nodeName)) { return; }
                if (parent.closest && parent.closest('.oc-term, .jl-run, pre, code')) { return; }
                /* 大标题（h3）和「详细属性」面板（h5）保持原样，只给正文里的名词上色 */
                if (parent.closest && parent.closest('h1, h2, h3, h5')) { return; }

                TERM.lastIndex = 0;
                if (!TERM.test(text)) { return; }
                TERM.lastIndex = 0;

                var frag = d.createDocumentFragment();
                var last = 0;
                var m;
                while ((m = TERM.exec(text)) !== null) {
                    if (m.index > last) {
                        frag.appendChild(d.createTextNode(text.slice(last, m.index)));
                    }
                    var span = make('span', 'oc-term', m[0]);
                    var elem = elemOf[normalizeTerm(m[0])];
                    if (elem) { span.setAttribute('data-elem', elem); }
                    frag.appendChild(span);
                    last = m.index + m[0].length;
                }
                if (last < text.length) {
                    frag.appendChild(d.createTextNode(text.slice(last)));
                }
                parent.replaceChild(frag, node);
            });
        });
    }

    /* ------- 11. 普通攻击介绍：给「普通攻击 / 重击 / 下落攻击」标签上色 ------- */
    function setupAttackLabels() {
        var LABEL = /^(\s*)(普通攻击|重击|下落攻击)(\s*)$/;

        all('.jieshao').forEach(function (card) {
            var head = card.querySelector('.jichuxingxi h3');
            if (!head) { return; }
            var title = (head.textContent || '').replace(/\s+/g, '');
            /* 只处理「普通攻击：xxx」这一张卡，其他技能卡里的同名文字不动 */
            if (title.indexOf('普通攻击') !== 0) { return; }

            all('.jineng h4', card).forEach(function (box) {
                var walker = d.createTreeWalker(box, NodeFilter.SHOW_TEXT, null);
                var nodes = [];
                while (walker.nextNode()) { nodes.push(walker.currentNode); }

                nodes.forEach(function (node) {
                    var m = LABEL.exec(node.nodeValue || '');
                    if (!m) { return; }
                    var parent = node.parentNode;
                    if (!parent) { return; }

                    var frag = d.createDocumentFragment();
                    if (m[1]) { frag.appendChild(d.createTextNode(m[1])); }
                    frag.appendChild(make('span', 'atk-label', m[2]));
                    if (m[3]) { frag.appendChild(d.createTextNode(m[3])); }
                    parent.replaceChild(frag, node);
                });
            });
        });
    }

    /* ------------------------------ 启动 ------------------------------ */
    function boot() {
        setupCards();
        setupNav();
        setupImages();
        setupLongBlocks();
        setupStatPanels();
        setupRefineValues();
        setupAttackLabels();
        setupTerms();
        setupReveal();
        setupBackToTop();
    }

    if (d.readyState === 'loading') {
        d.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
