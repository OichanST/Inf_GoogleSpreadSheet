// Import the functions you need from the SDKs you need
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import {getFirestore, writeBatch, connectFirestoreEmulator, collection, collectionGroup, doc, getDoc, getDocs, setDoc,updateDoc, query, where, or} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import {getAnalytics} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-analytics.js";
import {handleSearched,handleSearchCompleted} from "./script.js";
//import {search} from "./event.js";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: "AIzaSyCxIu0i4rartnqY0ZpvyCoxy_RXn6V1YG0",
	authDomain: "arcane-legacy-401802.firebaseapp.com",
	projectId: "arcane-legacy-401802",
	storageBucket: "arcane-legacy-401802.appspot.com",
	messagingSenderId: "390198756833",
	appId: "1:390198756833:web:ecb9283900aa12f01b3ea0",
	measurementId: "G-DT2SLP27KL"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Google Analytics初期化
const analytics = getAnalytics(app);
// firestore呼び出し
const db = getFirestore();
// Emulatorへの差し替え
if(window.location.hostname === "localhost"){
	// FirestoreEmulatorとの接続を行う
	connectFirestoreEmulator(db, "localhost", "8081");
}
// FireStoreドキュメント取得
const colRef = collection(db, "playdata");
// 該当ユーザーのプレイリザルトを取得
const docRef = doc(colRef, userId);

/**
 * 登録状態の確認
 */
export async function registrationCheck(){
	// FireStoreの登録状態確認
	getDoc(docRef).then(docSnap => {
		// 該当ユーザーのプレイデータが無い場合
		if(!docSnap.exists()){
			// ログ
			console.log("プレイリザルト：FireStoreに未登録 -> 初期化開始");
			// プレイデータの初期化
			const initData = new Array();
			// 曲データループ
			musicData.forEach(rec => {
				// プレイデータの初期生成
				initData.push(makeInitData(rec));
			});
			// バッチを準備　※1件ずつやるとタイムアウトする
			const batch = writeBatch(db);
			// documentにフィールドを指定 ※これがないとexistsが機能しないため設定する
			batch.set(docRef, {
				name:userId,
				version:version
			});
			// 初期化データループ
			for(const data of initData){
				// タイトルをキー用に取得
				let dataKey = data.TITLE;
				// /が含まれているとエラーになるため、／に変換
				if(dataKey.indexOf("/") >= 0){
					dataKey = dataKey.replaceAll("/", "／");
				}
				// ドキュメントからサブコレクション取得
				const playResult = collection(docRef, "playResult");
				// サブコレクションにDocument追加(Key=曲名)
				const musicDoc = doc(playResult, dataKey);
				// 追加したDocumentのフィールドにプレイリザルトを反映
				batch.set(musicDoc, data);
			}
			// バッチ実行
			batch.commit().then(() => {
				// 完了したら検索
				search();
			});
		// 該当のplaydataがある場合
		}else{
			// ログ
			console.log("プレイリザルト：FireStoreに登録済");
			// doument情報取得
			const data = docSnap.data();
			// ライバル登録済の場合
			if(data.rivals){
				// セッションに格納
				storage.set("rivals", data.rivals);
			}
			// 楽曲データバージョンとプレイリザルトバージョンに差異あり
			if(version != data.version){
				// データチェック
				dataCheck();
			// 差異なし
			}else{
				// 検索処理の実行
				search();
			}
		}
	});
}

/**
 * データチェック
 */
async function dataCheck(){
	// ログ
	console.log("バージョンが異なるため、データチェックを開始");
	// SP/DP取得
	const spdp = formVal("SPDP");
	// プレイリザルトの取得
	const col = collection(docRef, "playResult");
	// 全document取得
	getDocs(col).then(snapshots =>{
		// 曲名の配列
		const titleArray = new Array();
		// 取得結果ループ
		snapshots.forEach(snapshot =>{
			// フィールド取得
			const data = snapshot.data();
			// 曲名をリストに退避
			titleArray.push(data.TITLE);
		});
		// プロセス配列
		const p = new Array();
		// バージョン更新
		p.push(updateDoc(docRef, {version:version}));
		// 楽曲データループ
		for(const rec of musicData){
			// 曲名がリストに含まれていない＝データベース未登録の場合
			if(!titleArray.includes(rec.TITLE)){
				// 登録用のデータ作成
				const insertData = makeInitData(rec);
				// 登録　※Promise.allで一括実行するためリストに退避
				p.push(setDoc(doc(col, rec.TITLE), insertData));
			}
		}
		// 全setDocを一括実行
		Promise.all(p).then(() =>{
			// ログ
			console.log("all added");
			// 検索
			search();
		});
	});
}

/**
 * FireStore検索
 */
export function searchFirestore(){
	// SP/DP取得
	const spdp = formVal("SPDP");
	// LV取得
	const lv = formIntVal("LV");
	// リザルト取得
	const col = collection(docRef, "playResult");
	// クエリ設定（SP or DPで難易度が指定のリザルト）
	const q = query(col, 
		or(
			where(spdp + "N.DIFFICULT", "==", lv),
			where(spdp + "H.DIFFICULT", "==", lv),
			where(spdp + "A.DIFFICULT", "==", lv),
			where(spdp + "L.DIFFICULT", "==", lv)
		)
	);
	// クエリ実行
	getDocs(q).then(snapshot => {
		// ログ
		console.log("検索終了");
		// 取得結果をループ
		snapshot.forEach(doc => {
			// 取得データをJSON変換
			const docData = doc.data();
			// SPorDPNが指定レベルの場合
			if(docData[spdp + "N"] && docData[spdp + "N"].DIFFICULT == lv){
				// 編集
				docData[spdp + "N"].PLAYSTYLE = spdp;
				docData[spdp + "N"].TYPE = "N";
				// データフェッチ
				handleSearched(docData.TITLE, docData[spdp + "N"]);
			}
			// SPorDPHが指定レベルの場合
			if(docData[spdp + "H"] && docData[spdp + "H"].DIFFICULT == lv){
				// 編集
				docData[spdp + "H"].PLAYSTYLE = spdp;
				docData[spdp + "H"].TYPE = "H";
				// データフェッチ
				handleSearched(docData.TITLE, docData[spdp + "H"]);
			}
			// SPorDPAが指定レベルの場合
			if(docData[spdp + "A"] && docData[spdp + "A"].DIFFICULT == lv){
				// 編集
				docData[spdp + "A"].PLAYSTYLE = spdp;
				docData[spdp + "A"].TYPE = "A";
				// データフェッチ
				handleSearched(docData.TITLE, docData[spdp + "A"]);
			}
			// SPorDPLが指定レベルの場合
			if(docData[spdp + "L"] && docData[spdp + "L"].DIFFICULT == lv){
				// 編集
				docData[spdp + "L"].PLAYSTYLE = spdp;
				docData[spdp + "L"].TYPE = "L";
				// データフェッチ
				handleSearched(docData.TITLE, docData[spdp + "L"]);
			}
		});
		// 検索後処理
		handleSearchCompleted();
	});
}

/**
 * 全ライバル情報の取得
 */
export async function fetchAllRivalsData(rivals){
	// SP/DP取得
	const spdp = formVal("SPDP");
	// LV取得
	const lv = formIntVal("LV");
	// 全ライバル情報の取得
	await Promise.all(rivals.map(rival => getRivalData(spdp, lv, rival.Id)));
}
/**
 * ライバル情報の取得
 */
async function getRivalData(spdp, lv, rivalId){
	// 該当ユーザーのdocument取得
	const rivalDoc = doc(colRef, rivalId);
	// プレイリザルトcollection取得
	const rivalCol = collection(rivalDoc, "playResult");
	// クエリ生成
	const q = query(rivalCol,
		or(
			where(spdp + "N.DIFFICULT", "==", lv),
			where(spdp + "H.DIFFICULT", "==", lv),
			where(spdp + "A.DIFFICULT", "==", lv),
			where(spdp + "L.DIFFICULT", "==", lv)
		)
	);
	// 該当プレイリザルト取得
	const snapshots = await getDocs(q);
	// ライバルのリザルト
	const rivalResult = new Array();
	// firestore取得結果ループ
	snapshots.forEach(snapshot =>{
		// 取得結果をインスタンス化
		const data = snapshot.data();
		// 対応する楽曲データの検索
		const targetMusicData = musicData.filter(rec => rec.TITLE == data.TITLE)[0];
		// 対応するデータがある場合　※なしはあり得ない
		if(data[spdp + "N"] && data[spdp + "N"].DIFFICULT == lv){
			// 対応するデータをコピー
			const tempData = copy(data[spdp + "N"]);
			// 取得データに無い項目を楽曲データからコピー
			tempData["TITLE"] = data.TITLE;
			tempData["type"] = "N";
			tempData["BPM"] = targetMusicData.BPM;
			tempData["NOTES"] = targetMusicData[spdp + "N"].NOTES;
			// CN,BSSの反映
			if(targetMusicData[spdp + "N"].CN){
				tempData["CN"] = targetMusicData[spdp + "N"].CN;
			}
			if(targetMusicData[spdp + "N"].BSS){
				tempData["BSS"] = targetMusicData[spdp + "N"].BSS;
			}
			// リストに退避
			rivalResult.push(tempData);
		}
		// 対応するデータがある場合　※なしはあり得ない
		if(data[spdp + "H"] && data[spdp + "H"].DIFFICULT == lv){
			// 対応するデータをコピー
			const tempData = copy(data[spdp + "H"]);
			// 取得データに無い項目を楽曲データからコピー
			tempData["TITLE"] = data.TITLE;
			tempData["type"] = "H";
			tempData["BPM"] = targetMusicData.BPM;
			tempData["NOTES"] = targetMusicData[spdp + "H"].NOTES;
			// CN,BSSの反映
			if(targetMusicData[spdp + "H"].CN){
				tempData["CN"] = targetMusicData[spdp + "H"].CN;
			}
			if(targetMusicData[spdp + "H"].BSS){
				tempData["BSS"] = targetMusicData[spdp + "H"].BSS;
			}
			// リストに退避
			rivalResult.push(tempData);
		}
		// 対応するデータがある場合　※なしはあり得ない
		if(data[spdp + "A"] && data[spdp + "A"].DIFFICULT == lv){
			// 対応するデータをコピー
			const tempData = copy(data[spdp + "A"]);
			tempData["TITLE"] = data.TITLE;
			tempData["type"] = "A";
			tempData["BPM"] = targetMusicData.BPM;
			tempData["NOTES"] = targetMusicData[spdp + "A"].NOTES;
			// CN,BSSの反映
			if(targetMusicData[spdp + "A"].CN){
				tempData["CN"] = targetMusicData[spdp + "A"].CN;
			}
			if(targetMusicData[spdp + "A"].BSS){
				tempData["BSS"] = targetMusicData[spdp + "A"].BSS;
			}
			// リストに退避
			rivalResult.push(tempData);
		}
		// 対応するデータがある場合　※なしはあり得ない
		if(data[spdp + "L"] && data[spdp + "L"].DIFFICULT == lv){
			// 対応するデータをコピー
			const tempData = copy(data[spdp + "L"]);
			// 取得データに無い項目を楽曲データからコピー
			tempData["TITLE"] = data.TITLE;
			tempData["type"] = "L";
			tempData["BPM"] = targetMusicData.BPM;
			tempData["NOTES"] = targetMusicData[spdp + "L"].NOTES;
			// CN,BSSの反映
			if(targetMusicData[spdp + "L"].CN){
				tempData["CN"] = targetMusicData[spdp + "L"].CN;
			}
			if(targetMusicData[spdp + "L"].BSS){
				tempData["BSS"] = targetMusicData[spdp + "L"].BSS;
			}
			// リストに退避
			rivalResult.push(tempData);
		}
	});
	// ストレージに退避
	storage.set(rivalId + "|" + spdp + "_" + lv, rivalResult);
}

/**
 * FireStore保存
 */
export function saveFirestore(saveData){
	// タイトル取得　※/はエラーになるので／に変換
	const dataKey = saveData.TITLE.replaceAll("/", "／");
	// 該当曲のプレイデータ取得
	const playResult = collection(docRef, "playResult");
	// 対象のプレイスタイルを取得
	const result = doc(playResult, dataKey);
	// フィールド更新用のJSON生成
	const inputData = {};
	// SPorDP+N/H/A/Lのフィールド値としてMapを指定
	inputData[saveData.PLAYSTYLE] = {
		DIFFICULT:saveData.LV,
		OPEN:saveData.OPEN,
		CLEARSTATUS:saveData.CLEARSTATUS,
		PLAYRESULT:saveData.PLAYRESULT,
		EXSCORE:parseInt(saveData.EXSCORE, 10),
		MISSCOUNT:parseInt(saveData.MISSCOUNT, 10)
	};
	// フィールド更新
	updateDoc(result, inputData).then(res => {
		// 入力フォームを隠す
		hide("inputContainer");
		// 再検索する
		search();
	});
}
/**
 * ライバル追加
 */
export function addRival(){
	// 入力されたIDを取得
	const rivalId = getVal("rivalId");
	// 未入力なら何もしない
	if(!rivalId)return;
	// セッションに登録されているライバル情報の取得
	let rivals = storage.get("rivals");
	// データなし
	if(!rivals){
		// 配列を初期生成
		rivals = new Array();
	}
	// ライバル情報を検索
	getDoc(doc(colRef, rivalId)).then(ss => {
		// 情報あり
		if(ss.exists()){
			// リストに追加
			rivals.push({Id:rivalId});
			// データベースにライバル情報を書き込む
			updateDoc(docRef, {rivals:rivals}).then(() =>{
				// セッション情報の更新
				storage.set("rivals", rivals);
				// ライバル管理画面再描画
				fetchRival();
				// 再検索
				search();
			});
		// 情報なし
		}else{
			// メッセージ表示
			alert(`"${rivalId}"のデータは登録されていません。`);
		}
	});
}

/**
 * ライバル削除
 */
export function deleteRival(target){
	// 選択されたライバルID取得
	const rivalId = target.name;
	// セッションからライバルリスト取得
	let rivals = storage.get("rivals");
	// 指定IDのライバルのみを除去
	const newRivals = rivals.filter(rival => rival.Id != rivalId);
	// データベース更新
	updateDoc(docRef, {rivals:newRivals}).then(() =>{
		// セッション情報の更新
		storage.set("rivals", newRivals);
		// ライバル管理画面再描画
		fetchRival();
	});
}
/**
 * 全document検索
 */
async function getMultipleDocs(hashedList){
	// ドキュメントからサブコレクション取得
	const playResult = collection(docRef, "playResult");
	// documentへの参照を配列で生成
	const docRefs = hashedList.map(inputData => {
		// タイトルをキー用に取得
		let dataKey = inputData.title.trim();
		// /が含まれているとエラーになるため、／に変換
		if(dataKey.indexOf("/") >= 0){
			dataKey = dataKey.replaceAll("/", "／");
		}
		// documentへの参照を返却
		return doc(playResult, dataKey);
	});
	
	try{
		// Promise.allを用いてgetDocを全実行
		const snapshots = await Promise.all(docRefs.map(ref => getDoc(ref)));
		// 実行結果のsnapshotでexistsがtrueならtitle返却、無いならnull返却
		const refResult = snapshots.map(snapshot =>{
			// ログ
			console.log("snapshot checking...");
			// データが取得できた場合
			if(snapshot.exists()){
				// データ内容取得
				const data = snapshot.data();
				// 取得結果からタイトルのみを返却
				return data.TITLE;
			// データが取得できなかった場合
			}else{
				// nullを返却
				return null;
			}
		});
		// 処理結果を返却
		return refResult;
	// エラーハンドル
	}catch(e){
		console.error("Error:", e);
		throw e;
	}
}

/**
 * バッチによる一括更新
 */
export function processBatchUpdate(hashedList, isRecursive){
	// ログ
	console.log("batch update process start.");
	// バッチを準備　※1件ずつやるとタイムアウトする
	const batch = writeBatch(db);
	// ドキュメントからサブコレクション取得
	const playResult = collection(docRef, "playResult");
	// 処理分割用のインデックス
	let idx = 0;
	
	let pkgs = storage.get("pkg");
	
	if(!pkgs)pkgs = new Array();
	
	const pkgAssign = storage.get("MusicData").pkgAssign;
	// 入力データループ
	for(const inputData of hashedList){
		// タイトルをキー用に取得
		let dataKey = inputData.title.trim();
		
		if(inputData.Label == "Sub" && pkgAssign[dataKey]){
			inputData.Label = pkgAssign[dataKey];
		}
		// /が含まれているとエラーになるため、／に変換
		if(dataKey.indexOf("/") >= 0){
			dataKey = dataKey.replaceAll("/", "／");
		}
		// サブコレクションにDocument追加(Key=曲名)
		const musicDoc = doc(playResult, dataKey);
		// 更新用のハッシュマップ
		const updateData = {};
		
		let isOpen = false;
		
		if(inputData.Type == "Base"){
			isOpen = true;
		}
		
		if(inputData.Type == "Bits" && inputData.SPN_Unlocked == "TRUE"){
			isOpen = true;
		}
		// ノーツ数指定がある場合(SPN)
		if(inputData.SPN_Note_Count != ""){
		
			if(inputData.SPN_Letter != "NP"){
			
				isOpen = true;
				
				if(inputData.Type != "Base" && inputData.Type != "Bits" && !pkgs.includes(inputData.Label)){
				
					pkgs.push(inputData.Label);
				}
			}
			// SPN更新用のマップ生成
			updateData["SPN"] = {
				CLEARSTATUS:castClearStatus(inputData.SPN_Lamp),
				DIFFICULT:parseInt(inputData.SPN_Rating),
				EXSCORE:inputData.SPN_Ex_Score == "" ? 0 : parseInt(inputData.SPN_EX_Score),
				MISSCOUNT:inputData.SPN_Miss_Count == "-" ? 0 : parseInt(inputData.SPN_Miss_Count, 10),
				OPEN:isOpen,
				PLAYRESULT:inputData.SPN_Letter == "NP" ? "" : inputData.SPN_Letter
			}
		}
		// ノーツ数指定がある場合(SPH)
		if(inputData.SPH_Note_Count != ""){
			if(inputData.SPH_Letter != "NP"){
			
				isOpen = true;
				
				if(inputData.Type != "Base" && inputData.Type != "Bits" && !pkgs.includes(inputData.Label)){
				
					pkgs.push(inputData.Label);
				}
			}
			// SPH更新用のマップ生成
			updateData["SPH"] = {
				CLEARSTATUS:castClearStatus(inputData.SPH_Lamp),
				DIFFICULT:parseInt(inputData.SPH_Rating),
				EXSCORE:inputData.SPH_Ex_Score == "" ? 0 : parseInt(inputData.SPH_EX_Score),
				MISSCOUNT:inputData.SPH_Miss_Count == "-" ? 0 : parseInt(inputData.SPH_Miss_Count, 10),
				OPEN:isOpen,
				PLAYRESULT:inputData.SPH_Letter == "NP" ? "" : inputData.SPH_Letter
			}
		}
		// ノーツ数指定がある場合(SPA)
		if(inputData.SPA_Note_Count != ""){
		
			if(inputData.SPA_Letter != "NP"){
			
				isOpen = true;
				
				if(inputData.Type != "Base" && inputData.Type != "Bits" && !pkgs.includes(inputData.Label)){
					pkgs.push(inputData.Label);
				}
			}
			// SPA更新用のマップ生成
			updateData["SPA"] = {
				CLEARSTATUS:castClearStatus(inputData.SPA_Lamp),
				DIFFICULT:parseInt(inputData.SPA_Rating),
				EXSCORE:inputData.SPA_Ex_Score == "" ? 0 : parseInt(inputData.SPA_EX_Score),
				MISSCOUNT:inputData.SPA_Miss_Count == "-" ? 0 : parseInt(inputData.SPA_Miss_Count, 10),
				OPEN:isOpen,
				PLAYRESULT:inputData.SPA_Letter == "NP" ? "" : inputData.SPA_Letter
			}
		}
		// ノーツ数指定がある場合(SPL)
		if(inputData.SPL_Note_Count != ""){
		
			if(inputData.SPL_Letter != "NP"){
			
				isOpen = true;
				
				if(inputData.Type != "Base" && inputData.Type != "Bits" && !pkgs.includes(inputData.Label)){
					pkgs.push(inputData.Label);
				}
			}
			// SPL更新用のマップ生成
			updateData["SPL"] = {
				CLEARSTATUS:castClearStatus(inputData.SPL_Lamp),
				DIFFICULT:parseInt(inputData.SPL_Rating),
				EXSCORE:inputData.SPL_Ex_Score == "" ? 0 : parseInt(inputData.SPL_EX_Score),
				MISSCOUNT:inputData.SPL_Miss_Count == "-" ? 0 : parseInt(inputData.SPL_Miss_Count, 10),
				OPEN:isOpen,
				PLAYRESULT:inputData.SPL_Letter == "NP" ? "" : inputData.SPL_Letter
			}
		}
		// ノーツ数指定がある場合(DPN)
		if(inputData.DPN_Note_Count != ""){
		
			if(inputData.DPN_Letter != "NP"){
			
				isOpen = true;
				
				if(inputData.Type != "Base" && inputData.Type != "Bits" && !pkgs.includes(inputData.Label)){
					pkgs.push(inputData.Label);
				}
			}
			// DPN更新用のマップ生成
			updateData["DPN"] = {
				CLEARSTATUS:castClearStatus(inputData.DPN_Lamp),
				DIFFICULT:parseInt(inputData.DPN_Rating),
				EXSCORE:inputData.DPN_Ex_Score == "" ? 0 : parseInt(inputData.DPN_EX_Score),
				MISSCOUNT:inputData.DPN_Miss_Count == "-" ? 0 : parseInt(inputData.DPN_Miss_Count, 10),
				OPEN:isOpen,
				PLAYRESULT:inputData.DPN_Letter == "NP" ? "" : inputData.DPN_Letter
			}
		}
		// ノーツ数指定がある場合(DPH)
		if(inputData.DPH_Note_Count != ""){
		
			if(inputData.DPH_Letter != "NP"){
			
				isOpen = true;
				
				if(inputData.Type != "Base" && inputData.Type != "Bits" && !pkgs.includes(inputData.Label)){
					pkgs.push(inputData.Label);
				}
			}
			// DPH更新用のマップ生成
			updateData["DPH"] = {
				CLEARSTATUS:castClearStatus(inputData.DPH_Lamp),
				DIFFICULT:parseInt(inputData.DPH_Rating),
				EXSCORE:inputData.DPH_Ex_Score == "" ? 0 : parseInt(inputData.DPH_EX_Score),
				MISSCOUNT:inputData.DPH_Miss_Count == "-" ? 0 : parseInt(inputData.DPH_Miss_Count, 10),
				OPEN:(inputData.Type == "Bits" && inputData.DPH_Unlocked == "TRUE"),
				PLAYRESULT:inputData.DPH_Letter == "NP" ? "" : inputData.DPH_Letter
			}
		}
		// ノーツ数指定がある場合(DPA)
		if(inputData.DPA_Note_Count != ""){
		
			if(inputData.DPA_Letter != "NP"){
			
				isOpen = true;
				
				if(inputData.Type != "Base" && inputData.Type != "Bits" && !pkgs.includes(inputData.Label)){
					pkgs.push(inputData.Label);
				}
			}
			// DPA更新用のマップ生成
			updateData["DPA"] = {
				CLEARSTATUS:castClearStatus(inputData.DPA_Lamp),
				DIFFICULT:parseInt(inputData.DPA_Rating),
				EXSCORE:inputData.DPA_Ex_Score == "" ? 0 : parseInt(inputData.DPA_EX_Score),
				MISSCOUNT:inputData.DPA_Miss_Count == "-" ? 0 : parseInt(inputData.DPA_Miss_Count, 10),
				OPEN:isOpen,
				PLAYRESULT:inputData.DPA_Letter == "NP" ? "" : inputData.DPA_Letter
			}
		}
		// ノーツ数指定がある場合(DPL)
		if(inputData.DPL_Note_Count != ""){
		
			if(inputData.DPL_Letter != "NP"){
			
				isOpen = true;
				
				if(inputData.Type != "Base" && inputData.Type != "Bits" && !pkgs.includes(inputData.Label)){
					pkgs.push(inputData.Label);
				}
			}
			// DPL更新用のマップ生成
			updateData["DPL"] = {
				CLEARSTATUS:castClearStatus(inputData.DPL_Lamp),
				DIFFICULT:parseInt(inputData.DPL_Rating),
				EXSCORE:inputData.DPL_Ex_Score == "" ? 0 : parseInt(inputData.DPL_EX_Score),
				MISSCOUNT:inputData.DPL_Miss_Count == "-" ? 0 : parseInt(inputData.DPL_Miss_Count, 10),
				OPEN:isOpen,
				PLAYRESULT:inputData.DPL_Letter == "NP" ? "" : inputData.DPL_Letter
			}
		}
		// 追加したDocumentのフィールドにプレイリザルトを反映
		batch.update(musicDoc, updateData);
		// インクリメント
		idx++;
		// 500-1件で一旦終了
		if(idx == 499){
			break;
		}
	}
	// バッチ実行
	batch.commit().then(() => {
		storage.set("pkg", pkgs);
		// 再帰実行する場合
		if(isRecursive){
			// 処理済のデータをリストから除去
			const newHashedList = hashedList.slice(idx);
			// 再帰実行有無
			let nextRecursive = true;
			// リストサイズが再帰実行不要な場合
			if(newHashedList.length <= idx){
				// 再帰実行不要
				nextRecursive = false;
			}
			// 自処理を再帰実行
			processBatchUpdate(newHashedList, nextRecursive);
		// 再帰実行不要な場合
		}else{
			// ログ
			console.log("batch update completed.");
			// セッション検索結果のリセット
			clearSearchResult();
			// 検索
			search();
		}
	});
}
/**
 * クリア状況の変換(Reflux→)
 */
function castClearStatus(input){
	switch(input){
		case "NP":
			return "NO PLAY";
		case "F":
			return "FAILED";
		case "AC":
			return "ASSIST CLEAR";
		case "EC":
			return "EASY CLEAR";
		case "NC":
			return "CLEAR";
		case "HC":
			return "HARD CLEAR";
		case "EX":
			return "EX HARD CLEAR";
		case "FC":
			return "FULL COMBO";
	}
}
