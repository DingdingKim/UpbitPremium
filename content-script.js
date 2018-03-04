//부자 될거다 !!!!!!!!!

//환율 가져오는게 제일 우선이야 ! 환율도 사실 주기적으로 받아와야하는데 귀차나 ... 업비트도 한번만 받아오는거같은데 .. ?
//어차피 새로고침하면 다시 받아오니까 한페이지를 하루 이상씩 계속 새로고침도 않하고 켜놓겠어 ..... ?
//하지만 이거도 나중에는 3시간 주기로 다시 받아오도록 수정하자 ! 귀찮아서 안하는거잖아 지금 ! 뿌잉 ㅠ

var refreshIntervalId;

init();//초기화하고 시작!

function init() {
    chrome.extension.sendMessage({message: 'setIcon'});//아이콘 세팅
    
    //아이콘 눌렀을때의 리스너
    chrome.extension.onMessage.addListener(function(request) {
        if(request.message == 'stopService') {
            stopService();
        }
        else if(request.message == 'startService') {
            startService();
        }
    });
    
    startService();
}

function startService() {
    chrome.storage.local.get({'enable' : true}, function(data) {
        if(data.enable) {
            console.log('활성화되어있음');
            getExchangeRate(function(exchangeRate) {
                //환율을 가져왔으니 그 값가지고 계속 돌려
                refreshIntervalId = setInterval(function() {
                    //환율 가져왔 -> 비트 가격 가져와 -> 코인별로 계산해서 넣어줘
                    getBtcPrice(exchangeRate, function(oneBtcprice) {
                        setModifiedPriceText(exchangeRate, oneBtcprice);
                        //console.log('돌아가고있음');
                    });
                }, 2000);//이거 안걸면 로드완료 안돼서 안찍힘
            });
        }
        else {
            console.log('활성화안되어있음');
        }
    });
    console.log('---startService---');
}

function stopService() {
    htmlReset();
    //반복 종료
    clearInterval(refreshIntervalId);
    
    console.log('---stopService---');
}

//html 원상태로 돌려놓기
function htmlReset(exchangeRate, oneBtcprice) {
    var elementsTr = document.querySelectorAll("#root > div > div > div.mainB > section.ty02 > article:nth-child(2) > span.tabB > div > div > div > div:nth-child(1) > table > tbody > tr");
    
    var arrXhr = [];
    for(var i = 0; i < elementsTr.length; i++) {
        var element = elementsTr[i];
        var currencyKor = element.querySelector("td.tit");
        var currencyEng = element.querySelector("td.tit em").textContent.split("/")[0];//코인 영문명만 뽑기
        var upbitPriceKrw = parseFloat(element.querySelector("td.price strong").textContent.replace(/,/g, ''));
        
        arrXhr[i] = new XMLHttpRequest();
        (function (i){
            var priceRawInnerHtml = currencyKor.innerHTML;
            currencyKor.innerHTML = priceRawInnerHtml.substring(0, priceRawInnerHtml.lastIndexOf('</em>')+5);
        })(i);
    }
}

//html에 업프 텍스트 끼워넣자
function setModifiedPriceText(exchangeRate, oneBtcprice) {
    var elementsTr = document.querySelectorAll("#root > div > div > div.mainB > section.ty02 > article:nth-child(2) > span.tabB > div > div > div > div:nth-child(1) > table > tbody > tr");
    
    var arrXhr = [];
    for(var i = 0; i < elementsTr.length; i++) {
        var element = elementsTr[i];
        //var elementPriceStrong = element.querySelector("td.price strong");
        //var elementPrice = element.querySelector("td.price");
        var currencyKor = element.querySelector("td.tit");
        var currencyEng = element.querySelector("td.tit em").textContent.split("/")[0];//코인 영문명만 뽑기
        var upbitPriceKrw = parseFloat(element.querySelector("td.price strong").textContent.replace(/,/g, ''));
        
        arrXhr[i] = new XMLHttpRequest();
        (function (i){
            getUsdtPrice(arrXhr[i], currencyEng, upbitPriceKrw, currencyKor, exchangeRate, oneBtcprice, function(bittrexPrice, upbitPriceKrw, currencyKor) {
                if(upbitPriceKrw != -1) {
                    var premium = ((upbitPriceKrw - bittrexPrice) / upbitPriceKrw * 100).toFixed(2);

                    //console.log('usdtPrice: '+bittrexPrice+'/ price: '+upbitPriceKrw+'/ koPremium:'+premium);
                    var priceRawInnerHtml = currencyKor.innerHTML;
                    currencyKor.innerHTML = priceRawInnerHtml.substring(0, priceRawInnerHtml.lastIndexOf('</em>')+5) + ' ('+premium+'%)';
                }
                else {
                    callback('-');
                }
            });
        })(i);
    }
}

//업비트 코인별 비트마켓 가격 가져오기
function getUsdtPrice(xhr, currencyEng, upbitPriceKrw, currencyKor, exchangeRate, oneBtcprice, callback) {
    if(currencyEng == 'BTC') {
        var bittrexPrice = oneBtcprice * exchangeRate;
        callback(bittrexPrice, upbitPriceKrw, currencyKor);
    }
    else {
        var url = 'https://crix-api-endpoint.upbit.com/v1/crix/trades/ticks?code=CRIX.UPBIT.BTC-' + currencyEng;
        xhr.open("GET", url, true);
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var jsonResult = JSON.parse(xhr.responseText)[0];
                    var bittrexPrice = parseFloat(jsonResult.tradePrice) * oneBtcprice * exchangeRate;

                    if(bittrexPrice != NaN) {
                        callback(bittrexPrice, upbitPriceKrw, currencyKor);
                    }
                    else {
                        callback('-1', upbitPriceKrw, currencyKor);
                    }
                } else {
                    console.error(xhr.statusText);
                }
            }
        };
        xhr.send();
    }
}

//비트렉스 비트 단위가격 가져오기
function getBtcPrice(exchangeRate, callback) {
    var url = 'https://bittrex.com/api/v1.1/public/getticker?market=USDT-BTC';
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function (e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var jsonResult = JSON.parse(xhr.responseText);
                var oneBtcprice = parseFloat(jsonResult.result.Last);
                if(oneBtcprice != NaN) {
                    callback(oneBtcprice);
                }
                else {
                    callback('-1');
                }
            } else {
                console.error(xhr.statusText);
            }
        }
    };
    xhr.send();
}

//환율 가져오기
function getExchangeRate(callback) {
    var url = 'https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD';
    
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function (e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var jsonResult = JSON.parse(xhr.responseText)[0];
                var exchangeRate = parseInt(jsonResult.basePrice);
                
                if(exchangeRate != NaN) {
                    callback(exchangeRate);
                }
            } else {
                console.error(xhr.statusText);
            }
        }
    };
    xhr.send();
}