"use strict";
// 呼び出しURLを取得
const url = new URL(window.location.href);
// パラメータ取得
const params = url.searchParams;
// パラメータのID属性からユーザー取得
const userId = params.get("id");
// データバージョン
let version;
// 楽曲データ→Google Spread Sheetから読みだす。但し、ストレージにある場合、そちらを使用
// ※画面下部の更新ボタンにて更新可能
let musicData;
// カスタムBPMデータ
let customBPM;

/**
 * ドキュメントロード完了時処理
 */
document.addEventListener("DOMContentLoaded", evt => {

	console.log(screen.width);
	console.log(screen.height);
	// ログインユーザのチェック
	if(!userId){
		alert("パラメータでユーザーが指定されていません。");
		hide("spinner");
		return;
	}
	// セッションの操作者のIDを取得
	const operatorId = storage.get("operatorId");
	// 現在ログインしているユーザと操作者が異なる場合
	if(operatorId != userId){
		// ログ
		console.log("セッションに格納されている検索結果が前回操作者ではないため、ライバル情報をクリア");
		// セッションに格納されているライバル情報をクリア
		storage.remove("rivals");
		// 操作者を退避
		storage.set("operatorId", userId);
	}
	// 楽曲データのロード
	loadMusicData();
});

let startX;
let endX;

document.addEventListener("touchstart", evt => {

	startX = evt.touches[0].pageX;
});

document.addEventListener("touchend", evt => {

	endX = evt.changedTouches[0].pageX;
	
	swipe();
});

function swipe(){

	const diffX = startX - endX;
	
	console.log(diffX);

	if(diffX > 150){
		hide("menuContainer");
	}

	if(diffX < -150){
		show("menuContainer");
	}

}

