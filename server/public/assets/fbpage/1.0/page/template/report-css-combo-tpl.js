KISSY.add(function(){
    return {"html":"<h4>处理文件列表:</h4>\r\n{{#if !jobs.length}}\r\n    <div>\r\n        没有文件\r\n    </div>\r\n{{#else}}\r\n    <ul >\r\n        {{#each jobs as job}}\r\n            <li>\r\n                <h4><i class=\"icon-file\"></i> {{job.filename}} </h4>\r\n                <ul class=\"plugin-file-list\">\r\n                    {{#each job.imports as file}}\r\n                        <li>\r\n                            <i class=\"icon-bookmark\"></i>  \r\n                            {{file}}\r\n                        </li>\r\n                    {{/each}}\r\n                </ul>\r\n            </li>\r\n        {{/each}}\r\n    </ul>\r\n{{/if}}\r\n"};
});