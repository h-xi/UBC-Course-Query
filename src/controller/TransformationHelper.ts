import {InsightResult} from "./IInsightFacade";
import Decimal from "decimal.js";
import {isRoomField, isSectionField} from "./CheckValidTransformationHelper";

const transformData = (transformation: any, data: any[]): InsightResult[] => {
	const groupKeys: any = transformation["GROUP"];  //  eg: ["sections_dept", "sections_title"]
	const applyRules: any = transformation["APPLY"];
	let groupSets: any = getGroupResult(data, groupKeys);
	return getApplyResult(data, groupKeys, groupSets, applyRules);
};

const getApplyResult = (data: any, groupKeys: any, groupSets: any, applyRules: any): InsightResult[] => {
	let applyResult: InsightResult[] = [];
	let keys: any = processKeys(groupKeys);
	for (let key in groupSets) {
		let result: InsightResult = {};
		for (let gk of keys) {
			result[gk] = groupSets[key][0][gk];
		}
		for (let rule of applyRules) {
			const applyKey: string = Object.keys(rule)[0];
			result[applyKey] = getTokenResult(groupSets[key], rule[applyKey]);
		}
		applyResult.push(result);
	}
	return applyResult;
};

const getTokenResult = (oneSet: any[], applyFiled: any): number => {  // eg: applyField:{"MAX": "sections_avg"}
	const token: string = Object.keys(applyFiled)[0];
	const field: string = applyFiled[token].split("_")[1]; // eg: "avg"
	let returnValue: number;
	if (token === "MAX") {
		returnValue = getTokenMAX(oneSet, field);
	} else if (token === "MIN") {
		returnValue = getTokenMIN(oneSet, field);
	} else if (token === "AVG") {
		returnValue = getTokenAVG(oneSet, field);
	} else if (token === "SUM") {
		returnValue = getTokenSUM(oneSet, field);
	} else {
		returnValue = getTokenCOUNT(oneSet, field);
	}
	return returnValue;
};

const getTokenAVG = (group: any[], field: string): number => {
	let sum: Decimal = new Decimal(0);
	let count: number = 0;
	for (let roomOrSection of group) {
		sum = sum.add(new Decimal(roomOrSection[field]));
		count++;
	}
	let avg = sum.toNumber() / count;
	return Number(avg.toFixed(2));
};

const getTokenMAX = (group: any[], field: string): number => {
	let max: number = 0;
	for (let roomOrSection of group) {
		if (roomOrSection[field] > max) {
			max = roomOrSection[field];
		}
	}
	return max;
};

const getTokenMIN = (group: any[], field: string): number => {
	let min: number = group[0][field];
	for (let roomOrSection of group) {
		if (roomOrSection[field] < min) {
			min = roomOrSection[field];
		}
	}
	return min;
};

const getTokenSUM = (group: any[], field: string): number => {
	let sum: number = 0;
	for (let roomOrSection of group) {
		sum = sum + roomOrSection[field];
	}
	return Number(sum.toFixed(2));
};

const getTokenCOUNT = (group: any[], field: string): number => {
	let temp: any[] = [];
	for (let roomOrSection of group) {
		if (temp.indexOf(roomOrSection[field]) < 0) {
			temp.push(roomOrSection[field]);
		}
	}
	return temp.length;
};

const getGroupResult = (data: any, groupKeys: any): any => {
	let returnSet: any = {};
	let keys: string[] = processKeys(groupKeys);
	for (let eachData of data) {
		let eachKey: string = "";
		for (let gk of keys) {
			eachKey = eachKey + eachData[gk];
		}
		if (typeof returnSet[eachKey] === "undefined") {
			returnSet[eachKey] = [];
		}
		returnSet[eachKey].push(eachData);
	}
	return returnSet;
};

const processKeys = (groupKeys: any): string[] => {
	let returnArray: string[] = [];
	for (let k of groupKeys) {
		let field: string = k.split("_")[1];
		returnArray.push(field);
	}
	return returnArray;
};

const renameKeyWithId = (finalResult: InsightResult [], id: string): InsightResult [] => {
	const newHalfID: string = id + "_";
	for (let eachSection of finalResult) {
		const oldKeyArray = Object.keys(eachSection);  // eg: ["avg", "dept"]
		for (let eachOldKey of oldKeyArray) {
			if (isRoomField(eachOldKey) || isSectionField(eachOldKey)) {
				eachSection[newHalfID + eachOldKey] = eachSection[eachOldKey];
				delete eachSection[eachOldKey];
			}
		}
	}
	return finalResult;
};

const sortResult = (finalResult: InsightResult [], order: any): InsightResult [] => {
	if (typeof order === "string") {
		finalResult = singleSort(finalResult, order);
	} else {
		let sortedResult: InsightResult [] = finalResult;
		const sortKeys: string [] = order["keys"];
		const firstKey: string = sortKeys[0];
		sortedResult = singleSort(sortedResult, firstKey);
		if (sortKeys.length === 1) {
			return sortedResult;
		} else {
			for (let i = 1; i < sortKeys.length; i++) {
				sortedResult = doubleSort(sortKeys[i - 1], sortKeys[i], sortedResult);
			}
			return sortedResult;
		}
	}
	return finalResult;
};

const doubleSort = (prev: string, curr: string, result: InsightResult[]): InsightResult[] => {
	if (prev.includes("_")) {
		prev = prev.split("_")[1];  // eg: "avg"
	}
	if (curr.includes("_")) {
		curr = prev.split("_")[1];  // eg: "avg"
	}
	return result;
};

const singleSort = (finalResult: InsightResult [], order: string): InsightResult [] => {
	let orderKey: string = order;
	if (order.includes("_")) {
		orderKey = order.split("_")[1];  // eg: "avg"
	}
	if (orderKey === "avg" || orderKey === "pass" || orderKey === "fail" || orderKey === "audit" ||
		orderKey === "year" || orderKey === "lat" || orderKey === "lon" || orderKey === "seats" ||
		typeof finalResult[0][orderKey] === "number") {
		finalResult.sort((a,b) => {
			return (a as any)[orderKey] - (b as any)[orderKey];
		});
	} else {
		finalResult.sort(function(a, b) {
			if ((a as any)[orderKey] < (b as any)[orderKey]) {
				return -1;
			}
			if ((a as any)[orderKey] > (b as any)[orderKey]) {
				return 1;
			}
			return 0;
		});
	}
	return finalResult;
};


const getColumnsResult = (DataSet: any[], columnsKey: string[]): InsightResult [] => {
	let result: InsightResult [] = [];
	for (let eachSection of DataSet) {
		let temp: InsightResult = {};
		for (let eachKey of columnsKey) {
			temp[eachKey] = eachSection[eachKey];
		}
		result.push(temp);
	}
	return result;
};

const getColumnsKey = (columns: any): string [] => {
	let returnKeys: string [] = [];
	const columnKeys: string[] = columns["COLUMNS"];
	for (let eachKey of columnKeys) {
		if (!eachKey.includes("_")) {
			returnKeys.push(eachKey);
		} else {
			let temp = eachKey.split("_")[1];
			returnKeys.push(temp);
		}
	}
	return returnKeys;
};

export {getColumnsKey, transformData, getColumnsResult, sortResult, renameKeyWithId};
