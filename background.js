//아이콘 클릭해서 활성화 여부 반대로 바꿈
chrome.browserAction.onClicked.addListener(function (tab) {
    //기존값을 뒤집어서 넣어준다
    chrome.storage.local.get({'enable' : true}, function(data) {
        var enable = !data.enable;//뒤집은 값
        
        chrome.storage.local.set({'enable': enable}, function() {
            setIcon(enable);
            
            if(enable) {
                //chrome.tabs.executeScript(tab.id, {file: "content-script.js"});//다시 시작(이러면 아예 init부터 다시 시작해서 리스너들까지 중복으로 추가되어버림)
                //서비스 종료하라고 메세지 날려
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                    chrome.tabs.sendMessage(tabs[0].id, {message: 'startService'}, function(response) {});  
                });
            }
            else {
                //서비스 종료하라고 메세지 날려
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                    chrome.tabs.sendMessage(tabs[0].id, {message: 'stopService'}, function(response) {});  
                });
            }
        });
    });
});

//저장된 활성화 여부에 따라 아이콘 상태를 바꿔준다
chrome.extension.onMessage.addListener(function(request) {
    if(request.message == 'setIcon') {
        console.log('setIcon 와쪄');
        chrome.storage.local.get({'enable' : true}, function(data) {
            setIcon(data.enable);
        });
    }
});
    
//상태에 따라 아아콘 넣기
function setIcon(enable) {
    console.log('setIcon : ' + enable);
    chrome.browserAction.setIcon({path: (enable ? 'images/icon128On.png' : 'images/icon128Off.png')});
}