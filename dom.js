"use strict";
/**
 * DOM操作関数群
 */

/* DOM Selector */
function ById(id){
	return document.getElementById(id);
}
/**
 * テーブル行生成
 */
function createRow(){
	return document.createElement("tr");
}
/**
 * テーブルセル生成
 */
function createCell(){
	return document.createElement("td");
}
/**
 * DIVタグ生成
 */
function createDiv(option){
	
	const div = document.createElement("div");
	
	if(option){
		if(option.style){
			div.style = option.style;
		}
		if(typeof option.text != "undefined"){
			div.innerText = option.text;
		}
		if(typeof option.html != "undefined"){
			div.innerHTML = option.html;
		}
		if(option.class){
			div.setAttribute("class", option.class);
		}
	}
	
	return div;
}
/**
 * 行にテキストセルを追加
 */
function addText(r, text, style){

	const cell = document.createElement("td");
	
	cell.innerText = text;
	
	if(style){
		cell.style = style;
	}
	
	r.appendChild(cell);
	
	return cell;
}
/**
 * 表示
 */
function show(id){
	ById(id).style.display = "block";
}

/**
 * 隠す
 */
function hide(id){
	ById(id).style.display = "none";
}
/**
 * 無効化
 */
function disable(id){
	ById(id).disabled = true;
}
/**
 * 有効化
 */
function enable(id){
	ById(id).disabled = false;
}
/**
 * 値取得
 */
function getVal(id){
	return ById(id).value;
}
function getIntVal(id){
	return parseInt(getVal(id), 10);
}
/**
 * 値設定
 */
function setVal(id, val){
	ById(id).value = val;
}
/**
 * チェック状態取得
 */
function getChecked(id){
	return ById(id).checked;
}
/**
 * チェック状態設定
 */
function setChecked(id, flg){
	ById(id).checked = flg;
}
/**
 * フォームから値取得
 */
function formVal(name){
	return document.forms[0][name].value;
}
/**
 * フォームから値を数値で取得
 */
function formIntVal(name){
	return parseInt(formVal(name), 10);
}
/**
 * テキスト取得
 */
function getText(id){
	return ById(id).innerText;
}
/**
 * テキストを数値で取得
 */
function getInt(id){
	return parseInt(ById(id).innerText, 10);
}
/**
 * テキスト設定
 */
function setText(id, text){
	ById(id).innerText = text;
}
/**
 * HTML設定
 */
function setHtml(id, html){
	ById(id).innerHTML = html;
}
/**
 * HTMLクリア
 */
function clear(id){
	ById(id).innerHTML = null;
}
