// ==UserScript==
// @name         豆瓣剧集完结时间
// @namespace    http://tampermonkey.net/
// @version      15.0
// @description  在豆瓣剧集详情页显示完结时间、更新进度（多数据源）
// @author       You
// @match        https://movie.douban.com/subject/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var WEEKDAY_CN = ['周日','周一','周二','周三','周四','周五','周六'];
    var TVMAZE = 'https://api.tvmaze.com';

    function fetchJSON(url) {
        return fetch(url)
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
    }

    function getDoubanInfo() {
        var el = document.querySelector('#info');
        if (!el) return null;
        var txt = el.textContent || '';

        var imdbM = txt.match(/IMDb:\s*(tt\d+)/i);
        var seasonM = txt.match(/季数:\s*(\d+)/);
        var episodeM = txt.match(/集数:\s*(\d+)/);
        var premiereM = txt.match(/首播:\s*(\d{4}-\d{2}-\d{2})/);
        var regionM = txt.match(/制片国家\/地区:\s*(.+)/);

        var h1 = document.querySelector('#content h1 span');
        var title = h1 ? h1.textContent.trim() : '';
        var engM = title.match(/([A-Za-z][A-Za-z''\- ]+)/);
        var engTitle = engM ? engM[1].trim() : '';
        var chTitle = title.replace(/\s*[A-Za-z].*$/, '').replace(/\s*第.+季\s*/, '').trim();

        var akaM = txt.match(/又名:\s*(.+)/);
        var aka = akaM ? akaM[1].split('/')[0].trim() : '';

        var isChina = false;
        if (regionM) {
            isChina = regionM[1].indexOf('中国大陆') >= 0 || regionM[1].indexOf('中国台湾') >= 0 || regionM[1].indexOf('中国香港') >= 0;
        }

        return {
            imdbId: imdbM ? imdbM[1] : '',
            season: seasonM ? parseInt(seasonM[1]) : null,
            totalEpisodes: episodeM ? parseInt(episodeM[1]) : null,
            premiere: premiereM ? premiereM[1] : null,
            engTitle: engTitle,
            chTitle: chTitle,
            aka: aka,
            isChina: isChina,
            title: title
        };
    }

    function createInfoSpan() {
        var el = document.querySelector('#info');
        if (!el || document.querySelector('#end-date-info')) return null;

        var span = document.createElement('span');
        span.id = 'end-date-info';
        span.style.cssText = 'display:inline-block;margin:6px 0;padding:8px 12px;background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:1px solid #a5d6a7;border-radius:6px;font-size:13px;line-height:1.6;';

        var spans = el.querySelectorAll('span');
        var premiereEl = null;
        for (var i = 0; i < spans.length; i++) {
            if (spans[i].textContent.indexOf('首播') >= 0) {
                premiereEl = spans[i];
                break;
            }
        }
        if (premiereEl && premiereEl.parentNode) {
            premiereEl.parentNode.parentNode.insertBefore(span, premiereEl.parentNode.nextSibling);
        } else {
            el.appendChild(span);
        }

        return span;
    }

    function showResult(data) {
        var span = document.querySelector('#end-date-info');
        if (!span) span = createInfoSpan();
        if (!span) return;

        var link = data.sourceUrl ? ' <a href="' + data.sourceUrl + '" target="_blank" style="color:#bbb;font-size:11px;">🔗</a>' : '';

        if (data.notFound) {
            span.style.background = 'linear-gradient(135deg,#fff3e0,#fff8e1)';
            span.style.borderColor = '#ffcc80';
            span.innerHTML = '<span style="color:#ffa726;">⚠</span> <span style="color:#999">' + (data.reason || '未找到') + '</span>' + link;
        } else if (data.completed) {
            span.style.background = 'linear-gradient(135deg,#e3f2fd,#e8eaf6)';
            span.style.borderColor = '#90caf9';
            span.innerHTML = '<span style="color:#42a5f5;">✅</span> <b>已完结 ' + data.total + '/' + data.total + '</b> 完结日期: <b>' + data.endDate + '</b>' + link;
        } else {
            var updateFreq = '';
            if (data.updateDay && data.epPerWeek) {
                updateFreq = ' 每' + data.updateDay + '更新' + data.epPerWeek + '集';
            } else if (data.updateDay) {
                updateFreq = ' 每' + data.updateDay + '更新';
            }
            span.innerHTML = '<span style="color:#66bb6a;">▶</span> <b>更新中</b> ' + data.aired + '/' + data.total + updateFreq + ' <span style="color:#888;">预估完结:</span> <b>' + data.endDate + '</b>' + link;
        }
    }

    function filterSeason(episodes, season) {
        if (!episodes || !Array.isArray(episodes)) return [];
        var result = [];
        var seen = {};
        for (var i = 0; i < episodes.length; i++) {
            var ep = episodes[i];
            if (ep && ep.season === season && !seen[ep.number]) {
                seen[ep.number] = true;
                result.push({ number: ep.number, date: ep.airdate });
            }
        }
        result.sort(function(a, b) { return a.number - b.number; });
        return result;
    }

    function processEpisodes(episodes, season, sourceUrl, airedCount) {
        if (!episodes || episodes.length === 0) {
            showResult({ notFound: true, reason: '无剧集数据' });
            return;
        }

        var aired = 0;
        if (airedCount !== null && airedCount !== undefined) {
            aired = airedCount;
        } else {
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            for (var j = 0; j < episodes.length; j++) {
                var ep = episodes[j];
                if (ep && ep.date) {
                    var parts = ep.date.split('-');
                    if (parts.length === 3) {
                        var epDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        if (epDate <= today) { aired++; }
                    }
                }
            }
        }

        var endDate = episodes.length > 0 ? episodes[episodes.length - 1].date : null;
        var completed = aired >= episodes.length;

        var updateDay = null;
        var epPerWeek = null;
        if (!completed && episodes.length >= 2) {
            var p1 = episodes[0].date.split('-');
            var p2 = episodes[1].date.split('-');
            if (p1.length === 3 && p2.length === 3) {
                var d1 = new Date(parseInt(p1[0]), parseInt(p1[1]) - 1, parseInt(p1[2]));
                var d2 = new Date(parseInt(p2[0]), parseInt(p2[1]) - 1, parseInt(p2[2]));
                var diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
                if (diff >= 1 && diff <= 9) {
                    epPerWeek = Math.round(7 / diff);
                    updateDay = WEEKDAY_CN[d1.getDay()];
                }
            }
        }

        showResult({
            completed: completed,
            season: season,
            total: episodes.length,
            aired: aired,
            endDate: endDate,
            updateDay: updateDay,
            epPerWeek: epPerWeek,
            sourceUrl: sourceUrl
        });
    }

    function matchShow(results, info) {
        if (!info.premiere) return null;
        var year = new Date(info.premiere).getFullYear();
        for (var i = 0; i < results.length; i++) {
            var s = results[i].show;
            if (s && s.premiered) {
                var showYear = new Date(s.premiered).getFullYear();
                if (Math.abs(showYear - year) <= 2) {
                    return s.id;
                }
            }
        }
        return null;
    }

    function loadShow(showId, season) {
        var tvmazeUrl = 'https://www.tvmaze.com/shows/' + showId;
        return fetchJSON(TVMAZE + '/shows/' + showId + '/episodes')
            .then(function(episodes) {
                if (episodes && episodes.length > 0) {
                    var seasonEps = filterSeason(episodes, season);
                    if (seasonEps.length > 0) {
                        processEpisodes(seasonEps, season, tvmazeUrl);
                        return true;
                    }
                    for (var s = 1; s <= 20; s++) {
                        var altEps = filterSeason(episodes, s);
                        if (altEps.length > 0) {
                            processEpisodes(altEps, s, tvmazeUrl);
                            return true;
                        }
                    }
                }
                return false;
            });
    }

    function searchAndLoad(query, info, season) {
        return fetchJSON(TVMAZE + '/search/shows?q=' + encodeURIComponent(query))
            .then(function(results) {
                if (results && results.length > 0) {
                    var showId = matchShow(results, info);
                    if (showId) {
                        return loadShow(showId, season);
                    }
                }
                return false;
            });
    }

    function fallbackFromDouban(info) {
        if (!info.premiere || !info.totalEpisodes) return false;

        var premiereDate = new Date(info.premiere);
        var total = info.totalEpisodes;
        var epPerWeek = info.isChina ? 5 : 1;
        var sourceUrl = window.location.href;

        var weeksNeeded = Math.ceil(total / epPerWeek);
        var endDateObj = new Date(premiereDate);
        endDateObj.setDate(endDateObj.getDate() + weeksNeeded * 7 - 1);
        var endDate = endDateObj.getFullYear() + '-' +
                      String(endDateObj.getMonth() + 1).padStart(2, '0') + '-' +
                      String(endDateObj.getDate()).padStart(2, '0');

        var today = new Date();
        var completed = today >= endDateObj;

        if (completed) {
            showResult({ completed: true, total: total, aired: total, endDate: endDate, sourceUrl: sourceUrl });
        } else {
            var daysSinceStart = Math.round((today - premiereDate) / (1000 * 60 * 60 * 24));
            var weeksAired = Math.floor(daysSinceStart / 7);
            var aired = Math.min(weeksAired * epPerWeek, total);
            showResult({ completed: false, total: total, aired: aired, endDate: endDate, sourceUrl: sourceUrl });
        }
        return true;
    }

    function main() {
        var info = getDoubanInfo();
        if (!info || !info.totalEpisodes) {
            showResult({ notFound: true, reason: '非剧集页面' });
            return;
        }

        var season = info.season || 1;
        var span = createInfoSpan();
        if (span) span.innerHTML = '<span style="color:#66bb6a;">⏳</span> 正在获取更新信息...';

        // 优先用英文名搜索（跳过不可靠的IMDb查询）
        var searchPromise;
        if (info.engTitle && info.engTitle.length >= 3) {
            searchPromise = searchAndLoad(info.engTitle, info, season);
        } else {
            searchPromise = Promise.resolve(false);
        }

        searchPromise
            .then(function(success) {
                if (success) return;
                // 英文名失败，尝试中文名
                var searchName = info.aka || info.chTitle;
                if (searchName) {
                    return searchAndLoad(searchName, info, season);
                }
                return false;
            })
            .then(function(success) {
                if (!success) {
                    // 所有搜索失败，用豆瓣信息估算
                    if (!fallbackFromDouban(info)) {
                        showResult({ notFound: true, reason: 'TVmaze未收录' });
                    }
                }
            })
            .catch(function(err) {
                console.error('[完结时间] error:', err);
                if (!fallbackFromDouban(info)) {
                    showResult({ notFound: true, reason: '查询失败' });
                }
            });
    }

    setTimeout(main, 2000);
})();