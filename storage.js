"use strict";
/**
 * ストレージ操作関数群
 */
const storage = {
	// 退避
	set:(key, data)=>{
		// 引数データがある場合
		if(data){
			// 文字列
			if(typeof data == "string"){
				// そのまま退避
				window.sessionStorage.setItem(key, data);
			// 文字列でない
			}else{
				// JSONによるシリアライズをして退避
				window.sessionStorage.setItem(key, JSON.stringify(data));
			}
		}
	},
	// 取得
	get:(key)=>{
		// セッションストレージからデータ取得
		const temp = window.sessionStorage.getItem(key);
		try{
			// JSON変換を試みる
			return JSON.parse(temp);
		}catch(e){
			// 失敗した場合、そのまま返却
			return temp;
		}
	},
	// 削除
	remove:(key)=>{
		// 削除
		window.sessionStorage.removeItem(key);
	}
}

/**
 * 検索結果をストレージから削除
 */
function clearSearchResult(){

	const rivals = storage.get("rivals");

	for(let lv = 1; lv <= 12; lv++){
		storage.remove(userId + "|SP_" + lv);
		storage.remove(userId + "|DP_" + lv);
		
		if(rivals){
			for(const rivalId of rivals){
				storage.remove(rivalId + "|SP_" + lv);
				storage.remove(rivalId + "|DP_" + lv);
			}
		}
	}
}
