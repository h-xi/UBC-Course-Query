import {InsightError} from "./IInsightFacade";
import {isMKey, isSKey} from "./CheckQueryValidHelpers";

const checkStrucValid = (query: any, idStringArray: string[], allKeys: string[],
						 transformKeys: string[], transformResult: boolean): boolean => {
	if (!(Object.keys((query)).length === 3 || Object.keys((query)).length === 2)) {
		throw new InsightError("error: invalid structure of query");
	}
	if (Object.keys((query)).length === 2) {
		for (let key in query) {
			if (!(key === "WHERE" || key === "OPTIONS")) {
				throw new InsightError("error: unexpected extra section");
			}
		}
		if (!Object.keys((query)).includes("WHERE") || !Object.keys((query)).includes("OPTIONS")) {
			throw new InsightError("error: miss where or options section");
		}
		if (typeof query.OPTIONS !== "object") {
			throw new InsightError("options must be object");
		}
	}
	if (Object.keys((query)).length === 3) {
		for (let key in query) {
			if (!(key === "WHERE" || key === "OPTIONS" || key === "TRANSFORMATIONS")) {
				throw new InsightError("error: unexpected extra section");
			}
		}
		if (!Object.keys((query)).includes("WHERE") || !Object.keys((query)).includes("OPTIONS")
			|| !Object.keys((query)).includes("TRANSFORMATIONS")) {
			throw new InsightError("error: miss where or options section");
		}
		if (typeof query.OPTIONS !== "object") {
			throw new InsightError("options must be object");
		}
		if (typeof query.TRANSFORMATIONS !== "object") {
			throw new InsightError("transformations must be object");
		}
		transformResult = checkTransform(query.TRANSFORMATIONS, idStringArray, allKeys, transformKeys);
	}
	return transformResult;
};

const checkAllKeysType = (allKeys: string []): boolean => {
	let counter: number = 0;
	if (isSectionField(allKeys[0])) {
		for (let k of allKeys) {
			if (!isRoomField(k)) {
				counter++;
			}
		}
		return counter === allKeys.length;
	} else {
		for (let k of allKeys) {
			if (!isSectionField(k)) {
				counter++;
			}
		}
		return counter === allKeys.length;
	}
};

const isSectionField = (field: string): boolean => {
	return field === "avg" || field === "pass" || field === "fail" || field === "audit" || field === "year"
		|| field === "dept" || field === "id" || field === "instructor" || field === "title" || field === "uuid";
};

const isRoomField = (field: string): boolean => {
	return field === "lat" || field === "lon" || field === "seats" || field === "fullname" || field === "shortname"
		|| field === "type" || field === "furniture" || field === "href" || field === "number" || field === "name"
		|| field === "address";
};

const checkGroup = (group: any, idArray: string[], allKeys: string[], transformKeys: string[]): boolean => {
	if (!Array.isArray(group)) {
		throw new InsightError("error: invalid group structure");
	}
	if (group.length === 0) {
		throw new InsightError("error: invalid group structure");
	}
	const keys: any[] = group;
	for (let k of keys) {
		if (typeof k !== "string") {
			throw new InsightError("error: invalid key type in group");
		}
		if (isMKey(k, idArray, allKeys) || isSKey(k, idArray, allKeys)) {
			transformKeys.push(k);
		} else {
			throw new InsightError("error: invalid group keys");
		}
	}
	return true;
};

const checkTransform = (body: any, idArray: string [], allKeys: string[], transformKeys: string[]): boolean => {
	if (Object.keys(body).length !== 2) {
		throw new InsightError("error: invalid transformations keys");
	}
	for (let key in body) {
		if (!(key === "GROUP" || key === "APPLY")) {
			throw new InsightError("error: unexpected extra section in transformations");
		}
	}
	if (!Object.keys(body).includes("GROUP") || !Object.keys(body).includes("APPLY")) {
		throw new InsightError("error: miss transformations keys");
	}
	let checkGroupResult: boolean = checkGroup(body.GROUP, idArray, allKeys, transformKeys);
	let checkApplyResult: boolean = checkApply(body.APPLY, idArray, allKeys, transformKeys);
	return checkGroupResult && checkApplyResult;
};

const checkApply = (apply: any, idArray: string[], allKeys: string[], transformKeys: string[]): boolean => {
	if (!Array.isArray(apply)) {
		throw new InsightError("error: invalid apply structure");
	}
	const applyRules: any[] = apply;
	let counter: number = 0;
	let applyKeysArray: string[] = [];   // check unique
	for (let applyRule of applyRules) {
		if (typeof applyRule !== "object") {
			throw new InsightError("error: invalid key type in apply");
		}
		if (checkApplyRule(applyRule, applyKeysArray, idArray, allKeys, transformKeys)) {
			counter++;
		}
	}
	if (new Set(applyKeysArray).size !== applyKeysArray.length){
		return false;
	}
	return counter === apply.length;
};

const checkApplyRule = (applyRule: any, applyKeysArray: string [], idArray: string[], allKeys: string[],
	transformKeys: string[]): boolean => {
	if (Object.keys(applyRule).length !== 1) {
		throw new InsightError("error: invalid apply rule structure");
	}
	const applyKey: string = Object.keys(applyRule)[0];
	if (applyKey.includes("_") || applyKey.length === 0) {
		throw new InsightError("error: invalid apply key(empty string/containing underscore");
	}
	const applyValue: any = applyRule[applyKey];
	if (typeof applyValue !== "object") {
		throw new InsightError("error: invalid apply rule structure");
	}
	if (Object.keys(applyValue).length !== 1) {
		throw new InsightError("error: invalid apply rule structure");
	}
	const applyToken: string = Object.keys(applyValue)[0];
	if (!(applyToken === "MAX" || applyToken === "MIN" || applyToken === "AVG" || applyToken === "SUM"
		|| applyToken === "COUNT")) {
		throw new InsightError("error: invalid applyToken");
	}
	const applyAttribute: string = applyValue[applyToken];
	if (isSKey(applyAttribute, idArray, allKeys) && applyToken !== "COUNT") {
		throw new InsightError("error: invalid apply key");
	}
	if (applyToken === "MAX" || applyToken === "MIN" || applyToken === "AVG" || applyToken === "SUM") {
		if (!isMKey(applyAttribute, idArray, allKeys)) {
			throw new InsightError("error: invalid apply key");
		}
	}
	applyKeysArray.push(applyKey);
	transformKeys.push(applyKey);
	return true;
};


export {checkStrucValid, checkTransform, checkAllKeysType, isRoomField, isSectionField};


