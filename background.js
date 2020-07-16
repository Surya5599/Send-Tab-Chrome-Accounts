'use strict';

//chrome.storage.sync.set({"room": ""});

chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
      chrome.declarativeContent.onPageChanged.addRules([{
        conditions: [new chrome.declarativeContent.PageStateMatcher({
        })
        ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
      }]);
    });

var socket = io("https://server-chrometabopen.herokuapp.com/");

function updateInfo(){
  $.get('https://www.cloudflare.com/cdn-cgi/trace', function(data) {
      var value = data.match(/ip=.+/i);
      chrome.storage.sync.set({"ipAddr": value[0]});
  });
  chrome.identity.getProfileUserInfo((userInfo) => {
    if(userInfo.email == ""){
      alert("Please sign into chrome and turn on sync for this to work!");
      socket.disconnect();
    }
    else{
      chrome.storage.sync.set({"userEmail": userInfo.email});
    }
  });
}




chrome.contextMenus.removeAll();
chrome.contextMenus.create({
    id: "SendToWindow",
    title: "Send Tab To",
    contexts: ["all"]
},function(){
  if (chrome.runtime.lastError) {}
});



chrome.storage.sync.get(["userEmail", "ipAddr"], function (obj) {
  updateInfo();
  var data = {room: obj.ipAddr, email: obj.userEmail};
  //console.log(data);
  socket.emit('newUser', data);
});

socket.on("userJoined", addUser);
socket.on('addUser', createContext);
socket.on('tab', openThatTab);
socket.on('windowClosed', closedWindow);


function addUser(data){
  createContext(data);
  chrome.storage.sync.get(["userEmail", "ipAddr"], function (obj) {
    updateInfo();
    var newData = {iden: data.iden, email: obj.userEmail};
    socket.emit('sendInfo', newData);
  });
}

function createContext(data){
  chrome.contextMenus.create({
      parentId: "SendToWindow",
      id: data.iden,
      title: data.email,
      contexts: ["all"]
  }, function(){
    if (chrome.runtime.lastError) {
    }
  });
}

chrome.contextMenus.onClicked.addListener(function(info, tab){
  chrome.identity.getProfileUserInfo((userInfo) => {
    if(userInfo.email == ""){
      alert("Please sign into chrome and turn on sync for this to work!");
    }
    else if(info.menuItemId == "SendToWindow"){
      alert("No other accounts open");
    }
    else{
      socket.emit('openTab',{tab: tab.url, user: info.menuItemId});
      chrome.tabs.remove(tab.id);
    }
  });
});

chrome.windows.onCreated.addListener(function(){
  socket.connect();
  chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
      id: "SendToWindow",
      title: "Send Tab To",
      contexts: ["all"]
  },function(){
    if (chrome.runtime.lastError) {}
  });
  chrome.storage.sync.get(["userEmail", "ipAddr"], function (obj) {
    updateInfo();
    var data = {room: obj.ipAddr, email: obj.userEmail};
    //console.log(data);
    socket.emit('newUser', data);
  });
});


function openThatTab(data){
  chrome.tabs.create({
    url: data,
    active: true,
  })
  //console.log(data);
}

chrome.windows.onRemoved.addListener(function(){
      //socket.emit('remove', socket.room);
  socket.disconnect();
  //chrome.contextMenus.removeAll();
});

function closedWindow(data){
  chrome.contextMenus.remove(data);
}
