// マージ済楽曲データ
let mergedMusicData;
// 画面に表示するデータ
let displayData;
// クリア状況フィルタ
let clearStatusFilter = null;
// プレイ結果フィルタ
let playResultFilter = null;
// Google Spread Sheetデータ取得用のAPIのURL
const gsendpoint = "https://script.google.com/macros/s/AKfycbx-3V3VejKsgndZzvlNu9scncDVICCQ2qf9W3QyW3IYErVgkRZpNkIkPz_mzUnLAp8c3w/exec";

/**
 * 楽曲データのロード
 */
function loadMusicData(){
	// スピナーを表示
	show("spinner");
	// 表示データをクリア
	clear("dt");
	// セッションストレージから楽曲データ取得
	const storageMusicData = storage.get("MusicData");
	// セッションストレージに楽曲データが無い場合
	if(!storageMusicData){
		// ログ
		console.log("楽曲データ：ストレージデータなし -> Google SpreadSheetからロード");
		// Google spreadsheetデータをロードする
		fetch(gsendpoint + "?type=getMusicData").
		then(response => response.json()).
		then(data => {
			// セッションストレージに楽曲データを退避
			storage.set("MusicData", data);
			// バージョン退避
			version = data.version;
			// 画面表示のVersionに反映
			setText("displayVer", version);
			// 使用されるデータの書き換え
			musicData = data.musicList;
			
			customBPM = data.customBPM;
		});
	// セッションストレージにデータがある場合
	}else{
		// ログ
		console.log("楽曲データ：ストレージデータあり");
		// バージョン退避
		version = storageMusicData.version;
		// 画面表示のVersionに反映
		setText("displayVer", version);
		// 楽曲データをJSONオブジェクトにデシリアライズ
		musicData = storageMusicData.musicList;
		
		customBPM = storageMusicData.customBPM;
	}
	
	loadPlayResult();
}

function loadPlayResult(){
	// セッションストレージからプレイリザルト取得
	const storagePlayResult = storage.get(userId);
	// セッションストレージにプレイリザルトが無い場合
	if(!storagePlayResult){
		// ログ
		console.log("プレイリザルト：ストレージデータなし -> Google SpreadSheetからロード");
		// Google spreadsheetデータをロードする
		fetch(gsendpoint + "?type=getPlayResult&id=" + userId).
		then(response => response.json()).
		then(data => {
			// セッションストレージに楽曲データを退避
			storage.set(userId, data);
			
			mergeMusicData(data);
		});
	// セッションストレージにデータがある場合
	}else{
		mergeMusicData(storagePlayResult);
	}
}
/**
 * フィルタ
 */
function filter(argCntId, argType, argFilter){
	// 件数0の場合
	if(getText(argCntId) == "0"){
		// 何もしない
		return;
	}
	// クリア状況フィルタ指定
	if(argType == "CLEARSTATUS"){
		playResultFilter = null;
		clearStatusFilter = argFilter;
	// プレイ結果フィルタ指定
	}else if(argType == "PLAYRESULT"){
		playResultFilter = argFilter;
		clearStatusFilter = null;
	}
	// 再検索
	search();
}
/**
 * フィルタリセット
 */
function clearFilter(){
	clearStatusFilter = null;
	playResultFilter = null;
}

/**
 * マージ済楽曲データ初期化
 */
function clearMergedMusicData(){
	mergedMusicData = new Array();
}
/**
 * 楽曲データとプレイリザルトのマージ
 */
function mergeMusicData(playResult){
	// ストレージのデータで置き換える
	mergedMusicData = musicData;
	// 曲データループ
	playResult.forEach(rec => {
		// マージ済データから同一データを検出
		const mData = mergedMusicData.find(mRec => mRec.TITLE == rec.TITLE);
		// 対応するデータが見つかった場合
		if(mData){
			for(key in rec){
				if(
					key == "SPN" || key == "SPH" || key == "SPA" || key == "SPL" ||
					key == "DPN" || key == "DPH" || key == "DPA" || key == "DPL"
				){
					if(mData[key]){
						// 本体の楽曲データにリザルトを紐付ける
						// （入力フォームを開く際はこちらを用いる）
//						mData[key]["type"] = mRec[key].type;
						mData[key]["OPEN"] = rec[key].OPEN;
						mData[key]["CLEARSTATUS"] = rec[key].CLEARSTATUS;
						mData[key]["PLAYRESULT"] = rec[key].PLAYRESULT;
						mData[key]["EXSCORE"] = rec[key].EXSCORE;
						mData[key]["MISSCOUNT"] = rec[key].MISSCOUNT;
					}
				}
			}
		// 対応するデータ未検出
		}else{
			// ストレージデータがおかしい可能性大
			throw new Error("Exception occured (on search) please reflesh storage data... " + mRec.TITLE);
			return;
		}
	});
	
	console.log(mergedMusicData);
	
	search();
}

function search(){
	// SP/DP取得
	const spdp = formVal("SPDP");
	// LV取得
	const lv = formVal("LV");
	
	displayData = new Array();
	
	mergedMusicData.forEach(rec => {
	
		if(rec[spdp + "N"] && rec[spdp + "N"].DIFFICULT == lv){
			handleSearched(rec, spdp + "N");
		}
		if(rec[spdp + "H"] && rec[spdp + "H"].DIFFICULT == lv){
			handleSearched(rec, spdp + "H");
		}
		if(rec[spdp + "A"] && rec[spdp + "A"].DIFFICULT == lv){
			handleSearched(rec, spdp + "A");
		}
		if(rec[spdp + "L"] && rec[spdp + "L"].DIFFICULT == lv){
			handleSearched(rec, spdp + "L");
		}
	});
	
	handleSearchCompleted();
}

/**
 * 検索結果ハンドラ
 */
function handleSearched(rec, key){
	// 本来キーが存在しない筈はないが、重複データがある場合などにここで
	// キーの無いデータが発生するケースがあるため、IF条件追加
	if(rec[key]){
		// BPM
		let BPM = rec.BPM;
		// 特殊なBPM設定がある場合
		if(customBPM[rec.TITLE] && customBPM[rec.TITLE][key]){
			// 設定からBPMを取得
			BPM = customBPM[rec.TITLE][key];
		}
		// 検索結果にマージして退避
		displayData.push({
			TITLE:rec.TITLE,
			SORT:rec.SORT,
			BPM:BPM,
			NOTES:rec[key].NOTES,
			type:key.substring(2),
			BSS:rec[key].BSS,
			HBSS:rec[key].HBSS,
			CN:rec[key].CN,
			HCN:rec[key].HCN,
			DIFFICULT:rec[key].DIFFICULT,
			OPEN:rec[key].OPEN,
			CLEARSTATUS:rec[key].CLEARSTATUS,
			PLAYRESULT:rec[key].PLAYRESULT,
			EXSCORE:rec[key].EXSCORE,
			MISSCOUNT:rec[key].MISSCOUNT
		});
	}else{
		// こちらのルートに入るということはデータ不正
		console.log("Error:" + rec);
		throw new Error("セッションに保持されているデータが不整合です。[" + key + "]");
	}
}
/**
 * 検索完了時処理
 */
function handleSearchCompleted(){
	// ログ
	console.log("検索結果を画面に反映.");
	// SP/DP取得
	const spdp = formVal("SPDP");
	// LV取得
	const lv = formVal("LV");
	// ストレージに検索結果を保管する
//	storage.set(userId + "|" + spdp + "_" + lv, mergedMusicData);
	// ライバル情報の取得
	let rivals = storage.get("rivals");
	// 登録されている場合
	if(rivals){
		// セッションに該当のライバルデータがある場合は除外
		const filteredRivals = rivals.filter(rival => !storage.get(rival.Id + "|" + spdp + "_" + lv));
		// ログ
		console.log("ライバルデータの検索開始");
		// セッションに無い全ライバル情報を取得
		fetchAllRivalsData(filteredRivals).then(() =>{
			// ログ
			console.log("ライバルデータ読み出し完了");
			// 楽曲データ表示
			displayMusicData(rivals);
		});
	// 未登録
	}else{
		// 楽曲データ表示
		displayMusicData(rivals);
	}
}
/**
 * 楽曲データ表示
 */
function displayMusicData(rivals){
	// SP/DP取得
	const spdp = formVal("SPDP");
	// LV取得
	const lv = formVal("LV");
	// ソート条件取得
	const sort = formVal("sort");
	// 昇順/降順
	const ad = formVal("ad");
	// 昇順/降順をフラグ変換
	const adFlg = ad == "asc" ? 1 : -1;
	// Data Table取得
	const dt = ById("dt");
	// 表示内容をクリア
	dt.innerHTML = null;
	// 検索結果をソート
	displayData.sort((a, b) => {
		// 曲名によるソート
		if(sort == "title"){
			// LVソート
			if(a.DIFFICULT > b.DIFFICULT){
				return 1 * adFlg;
			}else if(a.DIFFICULT < b.DIFFICULT){
				return -1 * adFlg;
			}
			// ソートキーによるソート
			if(a.SORT && !b.SORT){
				return 1 * adFlg;
			}
			if(!a.SORT && b.SORT){
				return -1 * adFlg;
			}
			if(a.SORT && b.SORT){
				return (a.SORT - b.SORT) * adFlg;
			}
			if(!a.SORT && !b.SORT){
				// タイトルソート　※特殊文字変換
				let aTITLE = a.TITLE.replace("(", "").replace(")", "").replace("ä", "a").replace("∞", "oo").replace(":", "").replace("Ø", "0").replace("Ü", "U");
				let bTITLE = b.TITLE.replace("(", "").replace(")", "").replace("ä", "a").replace("∞", "oo").replace(":", "").replace("Ø", "0").replace("Ü", "U");
				// 数値は数値としてソート
				if(aTITLE.match(/^[0-9\.\!\&]/) && !bTITLE.match(/^[0-9\.\!\&]/)){
					if(bTITLE.match(/^[a-zA-Z]/)){
						return 1 * adFlg;
					}
				}else if(!aTITLE.match(/^[0-9\.\!\&]/) && bTITLE.match(/^[0-9\.\!\&]/)){
					if(aTITLE.match(/^[a-zA-Z]/)){
						return -1 * adFlg;
					}
				}
				// ULTiMATEは特殊なので全角文字から半角文字に変換
				if(aTITLE == "ＵＬＴｉＭΛＴＥ"){
					aTITLE = "ULTiMATE";
				}
				if(bTITLE == "ＵＬＴｉＭΛＴＥ"){
					bTITLE = "ULTiMATE";
				}
				// 大文字変換して比較
				if(aTITLE.toUpperCase() > bTITLE.toUpperCase()){
					return 1 * adFlg;
				}else if(aTITLE.toUpperCase() < bTITLE.toUpperCase()){
					return -1 * adFlg;
				}
			}
			// ここまで来たら同値扱い
			return 0;
		// スコアレートによるソート
		}else if(sort == "score"){
			const aRatio = a.EXSCORE / (a.NOTES * 2);
			const bRatio = b.EXSCORE / (b.NOTES * 2);
			
			return (aRatio - bRatio) * adFlg;
		// BPMによるソート
		}else if(sort == "BPM"){
			let aBPM = a.BPM.indexOf("-") >= 0 ? parseInt(a.BPM.split("-")[0], 10) : parseInt(a.BPM, 10);
			let bBPM = b.BPM.indexOf("-") >= 0 ? parseInt(b.BPM.split("-")[0], 10) : parseInt(b.BPM, 10);
			return (aBPM - bBPM) * adFlg;
		}
	});
	// ライバル勝敗データ
	const rivalsWinLose = {};
	// 検索結果ループ
	displayData.forEach(rec => {
		// 未解禁データ、且つ未解禁データを表示しない設定になっている場合
		if(getChecked("hideOpenData") && !rec.OPEN){
			// 何もしない
			return;
		}
		// クリア状況フィルタが指定されている場合
		if(clearStatusFilter != null){
			// フィルタ条件が未解禁の場合
			if(clearStatusFilter == "未解禁"){
				// 解禁済だった場合
				if(rec.OPEN){
					// 何もしない
					return;
				}
			// フィルタ条件が未指定の場合
			}else{
				// クリア状況が不一致の場合
				 if(clearStatusFilter != rec.CLEARSTATUS){
				 	// 何もしない
					return;
				}
			}
		}
		// プレイ結果フィルタが指定されている場合
		if(playResultFilter != null){
			// プレイ結果が不一致の場合
			if(playResultFilter != rec.PLAYRESULT){
				// 何もしない
				return;
			}
		}
		// 画面表示用の行生成
		let r = createRow();
		// CN表記用
		let cnText = "";
		let cnClass = "";
		// [TODO]MSSどうするか
		// 対象曲がCN or BSSの場合
		if(rec.BSS == "BSS" || rec.CN == "CN"){
			cnText = "CN";
			cnClass = "CN";
		// 対象曲がHBSS or HCNの場合
		}else if(rec.BSS == "HBSS" || rec.CN == "HCN"){
			cnText = "HCN";
			cnClass = "HCN";
		// 上記以外
		}else{
			cnClass = "NOCN";
		}
		// 楽曲データ出力レイアウト設定
		let htmlString = `
			<td>
				<div>
					<div style="display:flex;justify-content:flex-end;">
						<div class="${cnClass}" style="text-align:center;width:2.5em;margin-left:0.25em;margin-right:0.25em;">
							${cnText}
						</div>
						<div class="title">
							<div class="STAT TOP_${rec.CLEARSTATUS.replaceAll(" ", "_")} TOP_${rec.type}" style="width:0.7em;"></div>
							<div class="DIFFICULT DIF_${rec.type}" style="width:1.8em;padding-top:0.2em;">${rec.DIFFICULT}</div>
							<div style="padding-top:0.2em;${rec.OPEN ? "" : "color:gray;"}">${rec.TITLE}</div>
						</div>
						<div style="width:7em;font-size:0.9em;margin-left:0.3em;${rec.OPEN ? "" : "color:gray;"}">
							<div style="display:flex;justify-content:flex-start;">
								<div class="number" style="width:2em;">BPM</div>
								<div class="number" style="width:5em;text-align:right;">${rec.BPM}</div>
							</div>
							<div style="display:flex;justify-content:flex-start;">
								<div class="number" style="width:3em;">NOTES</div>
								<div class="number" style="width:4em;text-align:right;">${rec.NOTES}</div>
							</div>
						</div>
					</div>
					<div class="dataArea">
						<div style="display:flex;justify-content:space-between;">
							<div style="display:flex;justify-content;flex-start;">
								<div>
									<div class="PLAYRESULT ${rec.PLAYRESULT}"style="width:2.1em;font-size:1.5em;margin-right:0.1em;padding-top:0.1em;padding-left:0.1em;padding-right:0.1em;text-align:center;">
										<div>${rec.PLAYRESULT}</div>
									</div>
									<div class="number" style="font-size:0.9em;text-align:center;">${calc(rec.NOTES, rec.EXSCORE).detail}</div>
								</div>
								<div class="detailArea" style="font-size:1.0rem;">
		`;
		// 解禁済の場合、EXSCURE,MISS COUNTを表示
		if(rec.OPEN){
			htmlString += `
									<div style="display:flex;justify-content:flex-start;">
										<div class="number" style="width:6em;">EX SCORE</div>
										<div class="number" style="width:3em;text-align:right;padding-right:0.5em;">${rec.EXSCORE}</div>
										<div class="number" style="width:5.5em;">(${String(rec.EXSCORE / (rec.NOTES * 2) * 100).substring(0, 5)}%)</div>
										<div class="number" style="width:7em;">MISS COUNT</div>
										<div class="number" style="width:2.5em;text-align:right;padding-right:0.5em;">${rec.MISSCOUNT}</div>
									</div>
			`;
		}
		
		htmlString += `
									<div style="font-weight:bold;" class="number ${rec.CLEARSTATUS.replaceAll(" ", "_")}">${rec.CLEARSTATUS}</div>
								</div>
							</div>
		`;
		// 未プレイ以外でライバル登録済の場合
		if(rec.CLEARSTATUS != "NO PLAY" && rivals){
			// ライバル表示のレイアウト生成
			htmlString += "<div style='font-size:1.0rem;'>";
			// ライバル登録分繰り返す
			rivals.forEach(rival =>{
				// データ初期化
				if(!rivalsWinLose[rival.Id]){
					rivalsWinLose[rival.Id] = {win:0, lose:0, draw:0};
				}
				// セッションから既に検索済の情報を読み出す
				const rivalData = storage.get(rival.Id + "|" + spdp + "_" + lv);
				// 登録済の場合
				if(rivalData){
					// 該当の曲データの抽出
					const rivalRec = rivalData.filter(data => data.TITLE == rec.TITLE);
					// 該当のプレイスタイルデータの抽出
					const rrec = rivalRec[0];

					// ライバルがプレイ済の場合
					if(rrec.CLEARSTATUS != "NO PLAY"){
					
						let winlose;
						let clr;
						// EXSCOREによる比較
						if(rec.EXSCORE > rrec.EXSCORE){
							clr = "yellow";
							winlose = "WIN";
							rivalsWinLose[rival.Id].win++;
						}else if(rec.EXSCORE < rrec.EXSCORE){
							clr = "blue;"
							winlose = "LOSE";
							rivalsWinLose[rival.Id].lose++;
						}else{
							clr = "green";
							winlose = "DRAW";
							rivalsWinLose[rival.Id].draw++;
						}
						// 出力
						htmlString += `
							<div style="display:flex;justify-content:flex-end;">
								<div style="width:4em;">${rival.Id}</div>
								<div style="width:9em;font-weight:bold" class="${rrec.CLEARSTATUS.replaceAll(" ", "_")}">${rrec.CLEARSTATUS}</div>
								<div style="width:3em;text-align:right;margin-right:0.2em;">${rrec.EXSCORE}</div>
								<div class="DIFFICULT" style="width:3em;text-align:center;background-color:${clr};color:white;">${winlose}</div>
							</div>
						`;
					}
				}
			});
			
			htmlString += "</div>";
		}
		
		htmlString += `
						</div>
					</div>
				</div>
			</td>
		`;
		
		r.innerHTML = htmlString;
		// 行に必要な情報を追加
		r.style.cursor = "pointer";
		r.setAttribute("title", rec.TITLE);
		r.setAttribute("type", rec.type);
		// 行クリック時のイベント処理を追加
		r.onclick = function(){
			// 選択されたセルを取得
			let t = event.target;
			// 行以外の場合
			while(t.tagName != "TR"){
				// 行まで遡及
				t = t.parentNode;
			}
			// タイトルとタイプ取得
			const title = t.getAttribute("title");
			const type = t.getAttribute("type");
			// プレイリザルト入力フォームを開く
			openInputForm(title, type);
		}
		// テーブルに行を追加
		dt.appendChild(r);
	});
	// 入力を有効化する
	enable("SPDPSel");
	enable("LVSel");
	// スピナーを停止
	hide("spinner");
	// 集計結果を反映
	summary(rivalsWinLose);
	// スクロール位置をリセット
	ById("dtContainer").scrollTop = 0;
}

/**
 * 集計
 */
function summary(rivalsWinLose){
	// 現在表示している曲数を表示
	setText("total", displayData.length);
	
	clear("rivalsWinLose");
	
	if(rivalsWinLose){
		for(let rival in rivalsWinLose){
			setHtml("rivalsWinLose", `<div>${rival} WIN:${rivalsWinLose[rival].win}  LOSE:${rivalsWinLose[rival].lose} DRAW:${rivalsWinLose[rival].draw}</div>`);
		}
	}
	// 各変数の初期化
	let notOpenCnt = 0;
	let noPlayCnt = 0;
	let failedCnt = 0;
	let assistClearCnt = 0;
	let easyClearCnt = 0;
	let clearCnt = 0;
	let hardClearCnt = 0;
	let exhClearCnt = 0;
	let fullComboCnt = 0;
	let aaaCnt = 0;
	let aaCnt = 0;
	let aCnt = 0;
	let bCnt = 0;
	let cCnt = 0;
	let dCnt = 0;
	let eCnt = 0;
	let fCnt = 0;
	// 検索結果をループ
	displayData.forEach(rec => {
		// 未解禁データ
		if(!rec.OPEN){
			// 件数をカウント
			notOpenCnt++;
		// 解禁済データ
		}else{
			// プレイリザルトをカウント
			switch(rec.CLEARSTATUS){
				case "NO PLAY":
					noPlayCnt++;
					break;
				case "FAILED":
					failedCnt++;
					break;
				case "ASSIST CLEAR":
					assistClearCnt++;
					break;
				case "EASY CLEAR":
					easyClearCnt++;
					break;
				case "CLEAR":
					clearCnt++;
					break;
				case "HARD CLEAR":
					hardClearCnt++;
					break;
				case "EX HARD CLEAR":
					exhClearCnt++;
					break;
				case "FULL COMBO":
					fullComboCnt++;
					break;
			}
			switch(rec.PLAYRESULT){
				case "AAA":
					aaaCnt++;
					break;
				case "AA":
					aaCnt++;
					break;
				case "A":
					aCnt++;
					break;
				case "B":
					bCnt++;
					break;
				case "C":
					cCnt++;
					break;
				case "D":
					dCnt++;
					break;
				case "E":
					eCnt++;
					break;
				case "F":
					fCnt++;
					break;
			}
		}
	});
	// 計上結果の反映
	setText("notOpenCnt", notOpenCnt);
	setText("noPlayCnt", noPlayCnt);
	setText("failedCnt", failedCnt);
	setText("assistClearCnt", assistClearCnt);
	setText("easyClearCnt", easyClearCnt);
	setText("clearCnt", clearCnt);
	setText("hardClearCnt", hardClearCnt);
	setText("exhClearCnt", exhClearCnt);
	setText("fullComboCnt", fullComboCnt);
	setText("aaaCnt", aaaCnt);
	setText("aaCnt", aaCnt);
	setText("aCnt", aCnt);
	setText("bCnt", bCnt);
	setText("cCnt", cCnt);
	setText("dCnt", dCnt);
	setText("eCnt", eCnt);
	setText("fCnt", fCnt);
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
function save(){
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
	const mData = mergedMusicData.find(rec => rec.TITLE == title);
	// 検出できた場合
	if(mData){
		// 入力内容の反映
		mData[spdp].OPEN = getChecked("OPEN");
		mData[spdp].CLEARSTATUS = getVal("CLEARSTATUS");
		mData[spdp].PLAYRESULT = getText("PLAYRESULT");
		mData[spdp].EXSCORE = getIntVal("EXSCORE");
		mData[spdp].MISSCOUNT = getIntVal("MISSCOUNT");
	// 未検出
	}else{
		// エラー
		throw new Error("Exception occured (on save):no music data found " + title);
		return;
	}
	// ストレージから検索結果を取得
	const storageData = storage.get(userId);
	// ストレージの登録データから合致する情報を抽出
	const target = storageData.find(data => data.TITLE == title);
	// 抽出できた場合
	if(target){
		// 入力内容の反映
		target[spdp].OPEN = getChecked("OPEN");
		target[spdp].CLEARSTATUS = getVal("CLEARSTATUS");
		target[spdp].PLAYRESULT = getText("PLAYRESULT");
		target[spdp].EXSCORE = getIntVal("EXSCORE");
		target[spdp].MISSCOUNT = getIntVal("MISSCOUNT");
	// 未検出
	}else{
		// エラー
		throw new Error("Exception occured (on save):no storage data found " + title);
		return;
	}
	// ストレージに検索結果を保管する
	storage.set(userId, storageData);
	// 保存用にデータを成型し、Google SpreadSheet更新
	fetch(
		gsendpoint + "?id=" + userId,
		{
			method:"POST",
			mode:"no-cors",
			headers:{'Content-Type':'application/json'},
			body:JSON.stringify({
				TITLE:title,
				TYPE:spdp,
				OPEN:getChecked("OPEN"),
				CLEARSTATUS:getVal("CLEARSTATUS"),
				PLAYRESULT:getText("PLAYRESULT"),
				EXSCORE:getIntVal("EXSCORE"),
				MISSCOUNT:getIntVal("MISSCOUNT")
			})
		}
	).
	then(data => {
		// 入力フォームを非表示
		hide("inputContainer");
		
		search();
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
