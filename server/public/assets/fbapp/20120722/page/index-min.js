KISSY.add("utils/build-page",function(a){function c(){var c=b(".fb-build-page"),d=this;c.on("click",function(c){c.preventDefault();var e=b(c.target),f=e.siblings(".status"),g=e.siblings("input");f.html("building...");var h=g.val();a.ajax({url:e.attr("href"),data:{timestamp:h},dataType:"json",success:function(a){if(a.err){var b=a.err;f.html("Error:"+b.message),d.fire("error",{error:a.err});return}f.html("success!"),setTimeout(function(){f.html("")},2e3),a.reports&&d.fire("report",{reports:a.reports})}})})}var b=a.all;return a.extend(c,a.Base),new c}),KISSY.add("utils/build-common",function(a){var b=a.all;return{init:function(){var c=b("#fb-build-common"),d=c.siblings(".status");c.on("click",function(c){var e=b(c.target);c.preventDefault(),d.html("building..."),a.ajax({url:e.attr("href"),dataType:"json",success:function(a){if(a.err){var b=a.err;d.html("Error:"+b.message);return}d.html("success!"),setTimeout(function(){d.html("")},2e3)}})})}}}),KISSY.add("utils/calendar-init",function(a,b,c){var d=a.all;return{init:function(e){var f,g=new c.Popup({width:192});g.render();var h=new b(g.get("contentEl"));h.on("select",function(b){this.targetInput&&d(this.targetInput).val(a.Date.format(b.date,"yyyymmdd")),g.hide()}),d(e.triggers).on("click",function(a){clearTimeout(f),g.show();var b=d(a.target);g.align(b,["bl","tl"]),h.targetInput=b}).on("blur",function(a){f=setTimeout(function(){g.hide()},300)})}}},{requires:["calendar","overlay","calendar/assets/base.css"]}),KISSY.add("utils/app-history",function(a){function c(){var a=localStorage.getItem(b);if(!a)return[];try{var c=a.split(",")}catch(d){return[]}return c}function d(a){return localStorage.setItem(b,a.join(","))}if(!window.localStorage)return null;var b="AppHistory";return{push:function(b){var e=c();e=a.filter(e,function(a){return a!=b}),e.unshift(b),d(e)},get:function(){var a=c();return a},rm:function(b){var e=c();e=a.filter(e,function(a){return a!=b}),d(e)}}}),KISSY.add("page/index",function(a,b,c,d,e){var f=a.all;a.ready(function(){d.init({triggers:"input.timestamp-input"}),c.init();var b=location.search.substr(1),f=a.unparam(b);e&&e.push(f.root)})},{requires:["utils/build-page","utils/build-common","utils/calendar-init","utils/app-history"]}); 