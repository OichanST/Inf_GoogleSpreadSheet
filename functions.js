"use strict";

/**
 * データ初期化
 */
function makeInitData(rec){
	// 初期化データ
	const initialData = {
		OPEN:false,
		CLEARSTATUS:"NO PLAY",
		PLAYRESULT:"F",
		EXSCORE:0,
		MISSCOUNT:0
	}
	// コピー用データの準備
	const copyData = {};
	// タイトルをコピー
	copyData.TITLE = rec.TITLE;
	// SPNデータのコピー
	if(rec.SPN){
		copyData.SPN = copy(initialData);
		copyData.SPN.DIFFICULT = rec.SPN.DIFFICULT;
	}
	// SPHデータのコピー
	if(rec.SPH){
		copyData.SPH = copy(initialData);
		copyData.SPH.DIFFICULT = rec.SPH.DIFFICULT;
	}
	// SPAデータのコピー
	if(rec.SPA){
		copyData.SPA = copy(initialData);
		copyData.SPA.DIFFICULT = rec.SPA.DIFFICULT;
	}
	// SPLデータのコピー
	if(rec.SPL){
		copyData.SPL = copy(initialData);
		copyData.SPL.DIFFICULT = rec.SPL.DIFFICULT;
	}
	// DPNデータのコピー
	if(rec.DPN){
		copyData.DPN = copy(initialData);
		copyData.DPN.DIFFICULT = rec.DPN.DIFFICULT;
	}
	// DPHデータのコピー
	if(rec.DPH){
		copyData.DPH = copy(initialData);
		copyData.SPH.DIFFICULT = rec.SPH.DIFFICULT;
	}
	// DPAデータのコピー
	if(rec.DPA){
		copyData.DPA = copy(initialData);
		copyData.DPA.DIFFICULT = rec.DPA.DIFFICULT;
	}
	// DPLデータのコピー
	if(rec.DPL){
		copyData.DPL = copy(initialData);
		copyData.DPL.DIFFICULT = rec.DPL.DIFFICULT;
	}
	// コピーデータを返却
	return copyData;
}
/**
 * データコピー
 */
function copy(base){
	return JSON.parse(JSON.stringify(base));
}
/**
 * オプション画面を閉じる
 */
function closeOption(){
	// オプションフォームを隠す
	hide("optionContainer");
}
/**
 * BackSpace or Deleteを押下された時にフォーカスされている入力項目の入力内容をクリアする
 */
function focusReset(){
	if(event.keyCode == 8 || event.keyCode == 46){
		event.target.value = "";
	}
}
/**
 * キャンセル
 */
function cancel(){
	// 入力フォームを非表示にする
	hide("inputContainer");
}
/**
 * 解禁変更時処理
 */
function openChange(){
	// 解禁済
	if(event.target.checked){
		// 各入力を有効化
		enable("CLEARSTATUS");
		enable("EXSCORE");
		enable("MISSCOUNT");
	// 未解禁
	}else{
		// 各入力を無効化
		disable("CLEARSTATUS");
		disable("EXSCORE");
		disable("MISSCOUNT");
	}
}
/**
 * -値を入れられた場合、リセット
 */
function resetMinus(){
	if(event.target.value < 0){
		event.target.value = 0;
	}
}
/**
 * クリアレートを計算
 */
function calcRate(){
	// 対象曲のノーツ数取得
	const notes = getInt("NOTES");
	// ノーツ数*2 < EX SCORE⇒入力誤りなのでMAXの場合のEX SCOREに補正
	if(event.target.value > notes * 2){
		event.target.value = notes * 2;
	}
	// 計算する
	const res = calc(notes, event.target.value);
	// 計算結果を反映
	setText("PLAYRESULT", res.result);
	// 
	ById("PLAYRESULT").setAttribute("class", "PLAYRESULT " + res.result);
	// 
	if(res.detail != ""){
		setText("DETAIL", "(" + res.detail + ")");
	}
}
/**
 * レート計算処理本体
 */
function calc(notes, exscore){
	
	const ret = {
		result:"F",
		detail:""
	};
	/*
		AAA…8/9以上
		AA…7/9以上
		A…6/9以上
		B…5/9以上
		C…4/9以上
		D…3/9以上
		E…2/9以上
		F…2/9未満
	*/
	const max = notes * 2;
	
	if(isNaN(exscore))return ret;
	
	const rate = exscore / max;
	
	if(rate == 1){
		ret.result = "AAA";
		ret.detail = "MAX+0";
	}else if(rate >= (8 / 9)){
		ret.result = "AAA";
		if(rate >= (85 / 90)){
			ret.detail = "MAX-" + (max - exscore);
		}else{
			ret.detail= "AAA+" + (exscore - Math.ceil(max * (8 / 9)));
		}
	}else if(rate >= (7 / 9)){
		ret.result = "AA";
		if(rate >= (75 / 90)){
			ret.detail = "AAA-" + (Math.ceil(max * (8 / 9)) - exscore);
		}else{
			ret.detail = "AA+" + (exscore - Math.ceil(max * (7 / 9)));
		}
	}else if(rate >= (6 / 9)){
		ret.result = "A";
		if(rate >= (65 / 90)){
			ret.detail = "AA-" + (Math.ceil(max * (7 / 9)) - exscore);
		}else{
			ret.detail = "A+" + (exscore - Math.ceil(max * (6 / 9)));
		}
	}else if(rate >= (5 / 9)){
		ret.result = "B";
		if(rate >= (55 / 90)){
			ret.detail = "A-" + (Math.ceil(max * (6 / 9)) - exscore);
		}else{
			ret.detail = "B+" + (exscore - Math.ceil(max * (5 / 9)));
		}
	}else if(rate >= (4 / 9)){
		ret.result = "C";
		if(rate >= (45 / 90)){
			ret.detail = "B-" + (Math.ceil(max * (5 / 9)) - exscore);
		}else{
			ret.detail = "C+" + (exscore - Math.ceil(max * (4 / 9)));
		}
	}else if(rate >= (3 / 9)){
		ret.result = "D";
		if(rate >= (35 / 90)){
			ret.detail = "C-" + (Math.ceil(max * (4 / 9)) - exscore);
		}else{
			ret.detail = "D+" + (exscore - Math.ceil(max * (3 / 9)));
		}
	}else if(rate >= (2 / 9)){
		ret.result = "E";
		if(rate >= (25 / 90)){
			ret.detail= "D-" + (Math.ceil(max * (3 / 9)) - exscore);
		}else{
			ret.detail= "E+" + (exscore - Math.ceil(max * (2 / 9)));
		}
	}else{
		ret.result = "F";

		if(exscore != 0){
			ret.detail = "E-" + (Math.ceil(max * (2 / 9)) - exscore);
		}else{
			ret.detail = "";
		}
	}
	
	return ret;
}
// 前回の検索結果
let preHit = null;

/**
 * 入力内容をクリア
 */
function clearText(){
	setText("searchText", "");
}
/**
 * 前回の検索結果をクリア
 */
function clearPreHit(){
	preHit = null;
}
/**
 * Enterキーを押した際にJumpボタンと同じ挙動をする
 */
function jumpKeydown(){
	// Enter
	if(event.keyCode == 13){
		// jump
		jump();
		// Enterキーによるデフォルト動作の停止
		event.preventDefault();
	}
}
/**
 * Jumpボタン押下
 */
function jump(){
	// 検索結果表示領域の取得
	const dt = ById("dt");
	// 検索条件のテキスト取得
	const searchText = getVal("searchText");
	// 検索条件未入力であればスキップ
	if(!searchText)return;
	// 検索結果の全行を取得
	const rows = dt.getElementsByTagName("tr");
	
	for(const row of rows){
		// タイトル取得
		const title = row.getAttribute("title");
		// 前回の検索結果なし
		if(!preHit){
			// 検索条件を含む場合（中間一致）
			if(title.indexOf(searchText) >= 0){
				preHit = title;
				// ヒットした行を画面上に表示
				row.scrollIntoView();
				// 以後処理不要
				return;
			}
		// 前回の検索結果あり
		}else{
			// 前回の検索結果にヒットした場合
			if(title == preHit){
				// 前回の検索結果をクリアする
				preHit = null;
			}
		}
	}
}
/**
 * ライバル管理フォーム表示
 */
function openRival(){
	// 登録済のライバルを画面に表示
	fetchRival();
	// 表示
	show("rivalContainer");
}
/**
 * ライバル管理フォームクローズ
 */
function closeRival(){
	// 非表示
	hide("rivalContainer");
}
/**
 * セッションの内容をライバル管理フォームに反映
 */
function fetchRival(){
	// ストレージからライバルデータを取得
	let rivals = storage.get("rivals");
	// データ登録済の場合
	if(rivals){
		// 表示領域取得
		const rivalsList = ById("rivals");
		// 内容をクリア
		rivalsList.innerHTML = null;
		// ストレージ内容をループ
		rivals.forEach(rival=>{
			// 表示行を作成
			const div = createDiv({
				style:"display:flex;justify-content:space-between;",
				html:`<div>${rival.Id}</div><div><button type="button" name="${rival.Id}" onclick="deleteRival(this);">削除</button></div>`
			});
			// 表示領域に追加
			rivalsList.appendChild(div);
		});
	}
}
