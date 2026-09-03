// ==UserScript==
// @name         豆瓣增强合集
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  豆瓣增强：自动加载更多 + 剧集完结时间/更新进度（豆瓣全站）- 修复TVmaze lookup、韩文标题命中、TMDB第二源、0/10预估修复
// @author       pass
// @match        https://movie.douban.com/*
// @match        https://search.douban.com/*
// @match        https://book.douban.com/*
// @match        https://music.douban.com/*
// @connect      api.tvmaze.com
// @connect      api.themoviedb.org
// @run-at       document-idle
// @grant        none
// @inject-into  page
// ==/UserScript==

(function () {
  'use strict';
  var href = location.href;
  var isSubject = /\/subject\//.test(href);

  // ── 模块1：剧集完结时间（原 豆瓣剧集完结时间 16.1）仅在 subject 页运行 ──
  (function () {
    if (!isSubject) return;
    var WEEKDAY_CN = ['周日','周一','周二','周三','周四','周五','周六'];
    var TVMAZE = 'https://api.tvmaze.com';
    var TMDB = 'https://api.themoviedb.org/3';
    var TMDB_KEY = '';
    function fetchJSON(url) { return fetch(url).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); }
    function getDoubanInfo() {
        var el = document.querySelector('#info'); if (!el) return null; var txt = el.textContent || '';
        var imdbM = txt.match(/IMDb:\s*(tt\d+)/i); var seasonM = txt.match(/季数:\s*(\d+)/); var episodeM = txt.match(/集数:\s*(\d+)/);
        var premiereM = txt.match(/首播:\s*(\d{4}-\d{2}-\d{2})/); var regionM = txt.match(/制片国家\/地区:\s*(.+)/);
        var h1 = document.querySelector('#content h1 span'); var title = h1 ? h1.textContent.trim() : '';
        var engM = title.match(/([A-Za-z][A-Za-z''\- ]+)/); var engTitle = engM ? engM[1].trim() : '';
        var chTitle = title.replace(/\s*[A-Za-z].*$/, '').replace(/\s*第.+季\s*/, '').trim();
        var koM = title.match(/([\uAC00-\uD7AF]+)/); var koTitle = koM ? koM[1].trim() : '';
        var akaM = txt.match(/又名:\s*(.+)/); var akaRaw = akaM ? akaM[1] : '';
        var akaList = akaRaw ? akaRaw.split('/').map(function(s){return s.trim();}).filter(Boolean) : [];
        var akaEn = ''; var akaKo = '';
        for(var i=0;i<akaList.length;i++){ if(!akaEn && /^[A-Za-z]/.test(akaList[i])) akaEn = akaList[i]; if(!akaKo && /[\uAC00-\uD7AF]/.test(akaList[i])) akaKo = akaList[i]; }
        var aka = akaList.length ? akaList[0] : '';
        if(!koTitle && akaKo) koTitle = akaKo;
        if(!engTitle && akaEn) engTitle = akaEn;
        var region = regionM ? regionM[1].trim() : '';
        return { imdbId: imdbM ? imdbM[1] : '', season: seasonM ? parseInt(seasonM[1]) : null, totalEpisodes: episodeM ? parseInt(episodeM[1]) : null, premiere: premiereM ? premiereM[1] : null, engTitle: engTitle, chTitle: chTitle, koTitle: koTitle, aka: aka, akaEn: akaEn, akaList: akaList, region: region, title: title };
    }
    function createInfoSpan() {
        var el = document.querySelector('#info'); if (!el || document.querySelector('#end-date-info')) return null;
        var span = document.createElement('span'); span.id = 'end-date-info'; span.style.cssText = 'display:inline-block;margin:6px 0;padding:8px 12px;background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:1px solid #a5d6a7;border-radius:6px;font-size:13px;line-height:1.6;';
        var spans = el.querySelectorAll('span'); var premiereEl = null; for (var i=0;i<spans.length;i++){ if(spans[i].textContent.indexOf('首播')>=0){premiereEl=spans[i];break;} }
        if (premiereEl && premiereEl.parentNode) premiereEl.parentNode.parentNode.insertBefore(span, premiereEl.parentNode.nextSibling); else el.appendChild(span); return span;
    }
    function formatDate(date){ return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0'); }
    function inferUpdateFrequency(region){
        var regionMap={'韩国':{epPerWeek:2},'South Korea':{epPerWeek:2},'日本':{epPerWeek:1},'Japan':{epPerWeek:1},'中国大陆':{epPerWeek:5},'中国香港':{epPerWeek:5},'中国台湾':{epPerWeek:5},'China':{epPerWeek:5},'泰国':{epPerWeek:2},'Thailand':{epPerWeek:2},'美国':{epPerWeek:1},'United States':{epPerWeek:1},'英国':{epPerWeek:1},'United Kingdom':{epPerWeek:1}};
        for(var key in regionMap){ if(region.indexOf(key)>=0) return regionMap[key]; } return {epPerWeek:1};
    }
    function calculateAiredEpisodes(premiereDate, epPerWeek, totalEpisodes){
        var today=new Date(); today.setHours(0,0,0,0);
        var premiere=new Date(premiereDate); premiere.setHours(0,0,0,0);
        var daysSinceStart=Math.floor((today-premiere)/(1000*60*60*24));
        if(daysSinceStart<0) return 0;
        if(daysSinceStart===0) return 1;
        var weeksAired=Math.ceil((daysSinceStart+1)/7);
        var aired=weeksAired*epPerWeek;
        if(aired===0) aired=Math.min(epPerWeek,totalEpisodes);
        if(daysSinceStart>=1 && aired<Math.min(2,totalEpisodes)) aired=Math.min(2,totalEpisodes);
        return Math.min(aired,totalEpisodes);
    }
    function getMDLSearchUrl(info){ var query=info.engTitle||info.akaEn||info.koTitle||info.chTitle; if(!query) return window.location.href; return 'https://mydramalist.com/search?adv=titles&ty=68&q='+encodeURIComponent(query); }
    function showResult(data){
        var span=document.querySelector('#end-date-info'); if(!span) span=createInfoSpan(); if(!span) return;
        var link=data.sourceUrl?' <a href="'+data.sourceUrl+'" target="_blank" style="color:#bbb;font-size:11px;">🔗</a>':'';
        var sourceTag=data.isEstimate?' <span style="color:#ffa726;font-size:11px;background:#fff3e0;padding:2px 6px;border-radius:3px;">⚠ 预估</span>':' <span style="color:#66bb6a;font-size:11px;background:#e8f5e9;padding:2px 6px;border-radius:3px;">✓ 准确</span>';
        if(data.notFound){ span.style.background='linear-gradient(135deg,#fff3e0,#fff8e1)'; span.style.borderColor='#ffcc80'; span.innerHTML='<span style="color:#ffa726;">⚠</span> <span style="color:#999">'+(data.reason||'未找到')+'</span>'+sourceTag+link; }
        else if(data.completed){ span.style.background='linear-gradient(135deg,#e3f2fd,#e8eaf6)'; span.style.borderColor='#90caf9'; var endLabel=data.isEstimate?'预估完结:':'完结日期:'; span.innerHTML='<span style="color:#42a5f5;">✅</span> <b>已完结 '+data.total+'/'+data.total+'</b> '+endLabel+' <b>'+data.endDate+'</b>'+sourceTag+link; }
        else {
            var updateFreq=''; if(data.epPerWeek&&!data.updateDay) updateFreq=' 每周'+data.epPerWeek+'集'; else if(data.updateDay&&data.epPerWeek) updateFreq=' 每'+data.updateDay+'更新'+data.epPerWeek+'集'; else if(data.updateDay) updateFreq=' 每'+data.updateDay+'更新';
            var hint='';
            if(data.isEstimate && data.total>=8){
                hint=' <span style="color:#90a4ae;font-size:11px;">· 如人人视频已显示全集，可能为抢先资源，以官方播出为准</span>';
            }
            span.innerHTML='<span style="color:#66bb6a;">▶</span> <b>更新中</b> '+data.aired+'/'+data.total+updateFreq+' <span style="color:#888;">预估完结:</span> <b>'+data.endDate+'</b>'+sourceTag+link+hint;
        }
    }
    function filterSeason(episodes, season){ if(!episodes||!Array.isArray(episodes)) return []; var result=[]; var seen={}; for(var i=0;i<episodes.length;i++){var ep=episodes[i]; if(ep&&ep.season===season&&!seen[ep.number]){seen[ep.number]=true; result.push({number:ep.number,date:ep.airdate});}} result.sort(function(a,b){return a.number-b.number;}); return result; }
    function processEpisodes(episodes, season, sourceUrl){
        if(!episodes||episodes.length===0){ showResult({notFound:true,reason:'无剧集数据'}); return; }
        var aired=0; var today=new Date(); today.setHours(0,0,0,0); for(var j=0;j<episodes.length;j++){var ep=episodes[j]; if(ep&&ep.date){var parts=ep.date.split('-'); if(parts.length===3){var epDate=new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2])); if(epDate<=today) aired++;}}}
        var endDate=episodes.length>0?episodes[episodes.length-1].date:null; var completed=aired>=episodes.length; var updateDay=null,epPerWeek=null; if(!completed&&episodes.length>=2){var p1=episodes[0].date.split('-'); var p2=episodes[1].date.split('-'); if(p1.length===3&&p2.length===3){var d1=new Date(parseInt(p1[0]),parseInt(p1[1])-1,parseInt(p1[2])); var d2=new Date(parseInt(p2[0]),parseInt(p2[1])-1,parseInt(p2[2])); var diff=Math.round((d2-d1)/(1000*60*60*24)); if(diff>=1&&diff<=9){epPerWeek=Math.round(7/diff); updateDay=WEEKDAY_CN[d1.getDay()];}}}
        showResult({completed:completed,season:season,total:episodes.length,aired:aired,endDate:endDate,updateDay:updateDay,epPerWeek:epPerWeek,sourceUrl:sourceUrl,isEstimate:false});
    }
    function matchShow(results, info){
        if(!info.premiere) return null;
        var year=new Date(info.premiere).getFullYear();
        var qLower=(info.engTitle+' '+info.koTitle+' '+info.akaEn).toLowerCase();
        for(var i=0;i<results.length;i++){
            var s=results[i].show; if(!s) continue;
            if(s.externals && info.imdbId && s.externals.imdb===info.imdbId) return s.id;
            if(s.name && qLower && s.name.toLowerCase().indexOf(info.koTitle.toLowerCase())>=0 && info.koTitle) return s.id;
            if(s.premiered){
                var showYear=new Date(s.premiered).getFullYear();
                if(Math.abs(showYear-year)<=3) {
                    if(s.name && info.engTitle && s.name.toLowerCase().indexOf(info.engTitle.toLowerCase().split(' ')[0])>=0) return s.id;
                    if(i===0) return s.id;
                }
            }
        }
        if(results.length>0 && results[0].score>0.5) return results[0].show.id;
        return null;
    }
    function lookupByImdb(imdbId){ return fetchJSON(TVMAZE+'/lookup/shows?imdb='+imdbId).then(function(data){ if(data&&data.id) return data.id; return null; }).catch(function(){ return null; }); }
    function loadShow(showId, season){ var tvmazeUrl='https://www.tvmaze.com/shows/'+showId; return fetchJSON(TVMAZE+'/shows/'+showId+'/episodes').then(function(episodes){ if(episodes&&episodes.length>0){var seasonEps=filterSeason(episodes,season); if(seasonEps.length>0){processEpisodes(seasonEps,season,tvmazeUrl); return true;} for(var s=1;s<=20;s++){var altEps=filterSeason(episodes,s); if(altEps.length>0){processEpisodes(altEps,s,tvmazeUrl); return true;}}} return false; }); }
    function searchAndLoad(query, info, season){ if(!query) return Promise.resolve(false); return fetchJSON(TVMAZE+'/search/shows?q='+encodeURIComponent(query)).then(function(results){ if(results&&results.length>0){var showId=matchShow(results,info); if(showId) return loadShow(showId,season);} return false; }).catch(function(){ return false; }); }
    function searchTMDB(query, info, season){
        if(!TMDB_KEY) return Promise.resolve(false);
        if(!query) return Promise.resolve(false);
        var url=TMDB+'/search/tv?query='+encodeURIComponent(query)+'&language=zh-CN&api_key='+TMDB_KEY;
        return fetchJSON(url).then(function(data){
            if(!data || !data.results || data.results.length===0) return false;
            var best=null; var year=info.premiere?new Date(info.premiere).getFullYear():0;
            for(var i=0;i<data.results.length;i++){
                var r=data.results[i]; var d=r.first_air_date||'';
                if(year && d){ var y=parseInt(d.slice(0,4),10); if(Math.abs(y-year)>2) continue; }
                best=r; break;
            }
            if(!best) best=data.results[0];
            if(!best) return false;
            var tmdbUrl='https://www.themoviedb.org/tv/'+best.id;
            return fetchJSON(TMDB+'/tv/'+best.id+'?language=zh-CN&api_key='+TMDB_KEY).then(function(detail){
                var total=detail.number_of_episodes||info.totalEpisodes||0;
                var seasons=detail.seasons||[];
                var targetSeason=null;
                for(var s=0;s<seasons.length;s++){ if(seasons[s].season_number===season) targetSeason=seasons[s]; }
                var airDate=targetSeason?targetSeason.air_date:detail.first_air_date;
                if(total && airDate){
                    return fetchJSON(TMDB+'/tv/'+best.id+'/season/'+season+'?language=zh-CN&api_key='+TMDB_KEY).then(function(seasonData){
                        var eps=seasonData.episodes||[];
                        if(eps.length>0){
                            var mapped=eps.map(function(e){ return {number:e.episode_number, date:e.air_date||''}; });
                            mapped.sort(function(a,b){return a.number-b.number;});
                            processEpisodes(mapped,season,tmdbUrl);
                            return true;
                        }
                        var filtered=filterSeasonFromTMDB(eps,season);
                        if(filtered.length>0){ processEpisodes(filtered,season,tmdbUrl); return true; }
                        return false;
                    }).catch(function(){ return false; });
                }
                return false;
            });
        }).catch(function(){ return false; });
    }
    function filterSeasonFromTMDB(eps, season){ return []; }
    function fallbackFromDouban(info){
        if(!info.premiere||!info.totalEpisodes) return false; var total=info.totalEpisodes; var freq=inferUpdateFrequency(info.region); var epPerWeek=freq.epPerWeek; var sourceUrl=getMDLSearchUrl(info); var premiereDate=new Date(info.premiere); var weeksNeeded=Math.ceil(total/epPerWeek); var endDateObj=new Date(premiereDate); endDateObj.setDate(endDateObj.getDate()+(total-1)*Math.ceil(7/epPerWeek)); var endDate=formatDate(endDateObj); var aired=calculateAiredEpisodes(info.premiere,epPerWeek,total); var today=new Date(); today.setHours(0,0,0,0); var completed=today>=endDateObj; if(completed) showResult({completed:true,total:total,aired:total,endDate:endDate,sourceUrl:sourceUrl,isEstimate:true}); else showResult({completed:false,total:total,aired:aired,endDate:endDate,sourceUrl:sourceUrl,updateDay:null,epPerWeek:epPerWeek,isEstimate:true}); return true;
    }
    function main(){
        var info=getDoubanInfo(); if(!info||!info.totalEpisodes){ showResult({notFound:true,reason:'非剧集页面'}); return; }
        var season=info.season||1; var span=createInfoSpan(); if(span) span.innerHTML='<span style="color:#66bb6a;">⏳</span> 正在获取更新信息...';
        var queries=[];
        if(info.imdbId) queries.push(info.imdbId);
        if(info.koTitle) queries.push(info.koTitle);
        if(info.engTitle) queries.push(info.engTitle);
        if(info.akaEn && info.akaEn!==info.engTitle) queries.push(info.akaEn);
        if(info.chTitle && info.chTitle!==info.koTitle) queries.push(info.chTitle);
        var searchPromise;
        if(info.imdbId){
            searchPromise=lookupByImdb(info.imdbId).then(function(showId){ if(showId) return loadShow(showId,season); return false; });
        } else {
            searchPromise=Promise.resolve(false);
        }
        function tryQueries(idx){
            if(idx>=queries.length) return Promise.resolve(false);
            var q=queries[idx];
            if(!q || q.length<2) return tryQueries(idx+1);
            if(q===info.imdbId) return tryQueries(idx+1);
            return searchAndLoad(q,info,season).then(function(ok){ if(ok) return true; return tryQueries(idx+1); });
        }
        function tryTMDB(idx){
            if(idx>=queries.length) return Promise.resolve(false);
            var q=queries[idx];
            if(!q || q.length<2) return tryTMDB(idx+1);
            if(q===info.imdbId) return tryTMDB(idx+1);
            return searchTMDB(q,info,season).then(function(ok){ if(ok) return true; return tryTMDB(idx+1); });
        }
        searchPromise.then(function(success){
            if(success) return true;
            return tryQueries(0);
        }).then(function(success){
            if(success) return true;
            return tryTMDB(0);
        }).then(function(success){
            if(!success){ if(!fallbackFromDouban(info)) showResult({notFound:true,reason:'TVmaze未收录'}); }
        }).catch(function(err){ console.error('[完结时间] error:',err); if(!fallbackFromDouban(info)) showResult({notFound:true,reason:'查询失败'}); });
    }
    setTimeout(main, 2000);
  })();

  // ── 模块2：自动加载更多（原 豆瓣自动加载更多 11.0）全站列表页 ──
  (function () {
    var isListPage = /douban\.com/.test(href) && !/\/subject\//.test(href);
    if (!isListPage) return;
    var MAX = 200, COOLDOWN = 2000, count = 0, busy = false;
    function log(msg){ console.log('[豆瓣自动加载] '+msg); }
    function isVisible(el){ if(!el) return false; var s=window.getComputedStyle(el); return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&el.offsetHeight>0; }
    function inViewport(el){ var r=el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; }
    function findBtn(){
      var xp=document.evaluate('//*[contains(text(),"加载更多") or contains(text(),"Load More")]',document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
      for(var i=0;i<xp.snapshotLength;i++){ var el=xp.snapshotItem(i); if(isVisible(el)) return el; }
      var all=document.querySelectorAll('a, button, span, div, p');
      for(var j=0;j<all.length;j++){ var t=all[j].textContent.trim(); if((t==='加载更多'||t==='Load More')&&isVisible(all[j])) return all[j]; }
      return null;
    }
    function waitGone(btn, cb){ var done=false; function fire(){ if(!done){done=true; cb();}} var n=0; var t=setInterval(function(){ n++; if(!btn||!btn.parentNode||!isVisible(btn)||n>20){ clearInterval(t); fire(); } },200); setTimeout(function(){ clearInterval(t); fire(); },6000); }
    function tryClick(){ if(count>=MAX||busy) return; var btn=findBtn(); if(!btn||!inViewport(btn)) return; busy=true; btn.click(); ['mousedown','mouseup','click'].forEach(function(type){ btn.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,view:window})); }); count++; log('已加载 '+count+' 次'); waitGone(btn,function(){ setTimeout(function(){ busy=false; },COOLDOWN); }); }
    function start(){ new MutationObserver(function(){ tryClick(); }).observe(document.body,{childList:true,subtree:true}); setInterval(tryClick,1000); log('已启动，滚到底部自动加载'); tryClick(); }
    window.stopLoad=function(){ log('已停止，共加载 '+count+' 次'); };
    log('3秒后开始...'); setTimeout(start, 3000);
  })();
})();

