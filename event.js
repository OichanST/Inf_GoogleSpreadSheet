import {processBatchUpdate, searchFirestore, addRival, deleteRival} from "./firestore.js"
import {loadMusicData, clearMergedMusicData, mergeMusicData, handleSearched, handleSearchCompleted, filter, clearFilter} from "./script.js";

// イベント関数を公開
window.loadMusicData = loadMusicData;
window.search = search;
window.handleSearchCompleted = handleSearchCompleted;
window.openInputForm = openInputForm;
window.filter = filter;
window.clearFilter = clearFilter;
window.save = save;
window.addRival = addRival;
window.deleteRival = deleteRival;
window.readFile = readFile;
window.openPkg = openPkg;
window.setPkg = setPkg;

/**
 * ドキュメントロード完了時処理
 */
document.addEventListener("DOMContentLoaded", evt => {
	// ログインユーザのチェック
	if(!userId){
		alert("パラメータでユーザーが指定されていません。");
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

/**
 * 検索処理
 */
export function search(){
	// スピナーを起動
	show("spinner");
	// SP/DP取得
	const spdp = formVal("SPDP");
	// LV取得
	const lv = formVal("LV");
	// 検索結果リストをクリア
	clearMergedMusicData();
	// ストレージから検索結果を取得
	const ss = storage.get(userId + "|" + spdp + "_" + lv);
	// ストレージに検索結果がある場合
	if(ss){
		// ログ
		console.log("検索結果がストレージにあり->ストレージデータを用いて検索結果を表示");
		// データマージ
		mergeMusicData(spdp, ss);
		// 検索後処理を行う
		handleSearchCompleted();
	// ストレージに検索結果なし
	}else{
		// ログ
		console.log("検索結果がストレージになし->FireStore検索");
		// Firestore検索
		searchFirestore();
	}
}

/**
 * プレイ結果入力用のフォームを開く
 */
function openInputForm(title, type){
	// 画面入力のSP/DPを取得し、引数指定のN/H/A/Lを結合してプレイスタイル指定
	const spdp = formVal("SPDP") + type;
	// 選択楽曲データの取得
	const finder = musicData.find(rec => rec.TITLE == title);
	// 対象が検索れれた場合
	if(finder){
		// 各値を取得してフィールドに展開
		setText("TITLE", title);
		setText("SPDP", spdp);
		setText("NOTES", finder[spdp].NOTES);
		setChecked("OPEN", finder[spdp].OPEN);
		setVal("CLEARSTATUS", finder[spdp].CLEARSTATUS);
		setVal("EXSCORE", finder[spdp].EXSCORE);
		setVal("MISSCOUNT", finder[spdp].MISSCOUNT);
		// ノーツ数とEXSCOREからリザルト計算
		const res = calc(finder[spdp].NOTES, finder[spdp].EXSCORE);
		// 計算結果を反映
		setText("PLAYRESULT", res.result);
		ById("PLAYRESULT").setAttribute("class", "PLAYRESULT " + res.result);
		// 計算結果あり
		if(res.detail != ""){
			// 画面に反映
			setText("DETAIL", "(" + res.detail + ")");
		// 計算結果なし
		}else{
			// 画面表示を空表記
			setText("DETAIL", "");
		}
		// 曲解禁済の場合
		if(finder[spdp].OPEN){
			// 入力有効化
			enable("CLEARSTATUS");
			enable("PLAYRESULT");
			enable("EXSCORE");
			enable("MISSCOUNT");
		// 曲未解禁の場合
		}else{
			// 入力無効化
			disable("CLEARSTATUS");
			disable("PLAYRESULT");
			disable("EXSCORE");
			disable("MISSCOUNT");
		}
		// 入力フォームを表示
		show("inputContainer");
	}
}
/**
 * 保存処理
 */
export function save(){
	// ノーツ数取得
	const notes = getInt("NOTES");
	// EX SCORE取得
	const exScore = getInt("EXSCORE");
	// MAXを超過している場合
	if(exScore > notes * 2){
		// エラーにする
		alert("EX SCOREが不正");
		// 以後処理しない
		return;
	}
	// スピナーを起動
	show("spinner");
	// タイトル取得
	const title = getText("TITLE");
	// SP/DP取得
	const spdp = getText("SPDP");
	// LV取得
	const lv = formIntVal["LV"];
	// 楽曲データ読み出し
	const mData = musicData.find(rec => rec.TITLE == title);
	// 検出できた場合
	if(mData){
		// 入力内容の反映
		mData[spdp].OPEN = getChecked("OPEN");
		mData[spdp].CLEARSTATUS = getVal("CLEARSTATUS");
		mData[spdp].PLAYRESULT = getText("PLAYRESULT");
		mData[spdp].EXSCORE = getInt("EXSCORE");
		mData[spdp].MISSCOUNT = getInt("MISSCOUNT");
	// 未検出
	}else{
		// エラー
		throw new Error("Exception occured (on save):no music data found " + title);
		return;
	}
	// ストレージから検索結果を取得
	const storageData = storage.get(userId + "|" + spdp.substring(0, 2) + "_" + lv);
	// ストレージの登録データから合致する情報を抽出
	const target = storageData.filter(data => data.TITLE == title && data.type == spdp.substring(2));
	// 抽出できた場合
	if(target){
		// 入力内容の反映
		data.OPEN = getChecked("OPEN");
		data.CLEARSTATUS = getVal("CLEARSTATUS");
		data.PLAYRESULT = getText("PLAYRESULT");
		data.EXSCORE = getInt("EXSCORE");
		data.MISSCOUNT = getInt("MISSCOUNT");
	// 未検出
	}else{
		// エラー
		throw new Error("Exception occured (on save):no storage data found " + title);
		return;
	}
	// ストレージに検索結果を保管する
	storage.set(userId + "|" + spdp.substring(0, 2) + "_" + lv, ss);
	// 保存用にデータを成型し、Firestore更新
    saveFirestore({
		TITLE:title,
		LV:lv,
		PLAYSTYLE:spdp,
		OPEN:getChecked("OPEN"),
		CLEARSTATUS:getVal("CLEARSTATUS"),
		PLAYRESULT:getText("PLAYRESULT"),
		EXSCORE:getVal("EXSCORE"),
		MISSCOUNT:getVal("MISSCOUNT")
	});
}
/**
 * Reflux連携 TSVファイル読み込み
 */
function readFile(){
	// スピナーを表示
	show("spinner");
	// ファイルリーダー
	const reader = new FileReader();
	// アップロードファイル取得
	const files = event.target.files;
	// キャンセル時の処理
	if(files.length <= 0)return;
	// アップロードファイル取得
	const f = files[0];
	// キャンセル時の処理
	if(!f)return;
	// ファイルリーダーでファイル読み取り時のイベント処理
	reader.onload = (evt) => {
		// 読み取り内容の取得
		const fileContent = evt.target.result;
		// 改行で配列に分割
		const records = fileContent.split("\r\n");
		// ヘッダ情報リスト
		const headerInfo = new Array();
		// ヘッダ読み取りフラグ
		let readHeader = false;
		// 一時リスト
		let tempList = new Array();
		// 読み取ったレコード単位で処理
		records.forEach((rec) => {
			// タブで各項目値に分割
			const recList = rec.split("\t");
			// ヘッダ未読み取り＝先頭行の処理の場合
			if(!readHeader){
				// 各項目値をヘッダ情報として退避
				recList.forEach(key =>{
					headerInfo.push(key);
				});
				// ヘッダ読み取りフラグON
				readHeader = true;
			// ヘッダ＝先頭行以外の場合
			}else{
				// レコード項目値を退避するためのハッシュ
				const recHash = {};
				// ヘッダ分ループ
				for(let i = 0; i < headerInfo.length; i++){
					// ヘッダの値をキーとしてハッシュに格納　※半角SPはアンダースコアに変換
					recHash[headerInfo[i].replaceAll(" ", "_")] = recList[i];
				}
				// 一時リストにハッシュ化されたレコードを退避
				tempList.push(recHash);
			}
		});
		// 曲タイトルの無いレコードは除外する
		const hashedList = tempList.filter(inputData => inputData.title != "");
		// バッチ更新処理を起動
		processBatchUpdate(hashedList, true);
		
		ById("tracker").value = null;
	};
	// ファイルの読み取りをトリガ
	reader.readAsText(f);
}

function openPkg(){

	const pkgList = ById("pkgList");
	
	let storagePkg = storage.get("pkg");
	
	if(!storagePkg)storagePkg = new Array();
	
	const pkgs = storage.get("MusicData").packages;
	
	for(const pkg of pkgs){
		
		const pkgTag = createDiv({
			html:`
				<input type="checkbox" id="${pkg.id}" value="${pkg.id}" onchange="setPkg();" ${storagePkg.includes(pkg.id) ? "checked" : ""}>
				<label for="${pkg.id}">
					${pkg.folder ? pkg.name + "(" + pkg.folder + ")" : pkg.name}
				</label>
			`
		});
		
		pkgList.appendChild(pkgTag);
	}
	
	show("pkgContainer");
}

function setPkg(){
	let pkg = storage.get("pkg");
	
	if(!pkg)pkg = new Array();
	
	if(event.target.checked){
		pkg.push(event.target.value);
	}else{
		if(pkg.indexOf(event.target.value) >= 0){
			pkg.splice(pkg.indexOf(event.target.value), 1);
		}
	}
	
	console.log(pkg);
	
	storage.set("pkg", pkg);
}
