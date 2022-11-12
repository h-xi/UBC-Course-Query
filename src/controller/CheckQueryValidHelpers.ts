import {InsightError} from "./IInsightFacade";

const checkWhere = (body: any, idArray: string [], allKeys: string []): boolean => {
	if (typeof body === "object") {
		if (Object.keys(body).length === 0) {
			return true;
		} else if (Object.keys(body).length > 1) {
			throw new InsightError("error: invalid WHERE structure");
		}
		return checkFilter(body, idArray, allKeys);
	} else {
		throw new InsightError("where must be object");
	}
};

const checkFilter = (body: any, idArray: string [], allKeys: string []): boolean => {
	for (let key in body) {
		if (key === "AND" || key === "OR") {
			let resultLogicCheck = checkLogic(body, key, idArray, allKeys);
			return resultLogicCheck;
		} else if (key === "LT" || key === "GT" || key === "EQ") {
			let resultMComparisonCheck = checkMComparison(body[key], idArray, allKeys);
			return resultMComparisonCheck;
		} else if (key === "IS") {
			let resultSComparisonCheck = checkSComparison(body[key], idArray, allKeys);
			return resultSComparisonCheck;
		} else if (key === "NOT") {
			let resultNegationCheck = checkNegation(body[key], idArray, allKeys);
			return resultNegationCheck;
		} else {
			throw new InsightError("error: unexpected key in WHERE");
		}
	}
	return true; // change this
};

const checkLogic = (body: any, key: string, idArray: string [], allKeys: string []): boolean => {
	if (!Array.isArray(body[key])) {
		throw new InsightError("OR/AND must be an array");
	}
	let objectArray = body[key];
	let counter: number = 0;
	if (objectArray.length === 0) {
		throw new InsightError("error: invalid logic key structure");
	} else {
		for (let i of objectArray) {
			if (typeof i === "object") {
				if (checkFilter(i, idArray, allKeys)) {
					counter++;
				}
			} else {
				throw new InsightError("OR should be an object array");
			}
		}
		return counter === objectArray.length;
	}
};

const checkMComparison = (filterObject: any, idArray: string [], allKeys: string []): boolean => {
	if (Object.keys(filterObject).length === 0 || Object.keys(filterObject).length > 1) {
		throw new InsightError("error: invalid MComparison structure");
	}
	// 1.check key is mKey
	// 2. check value is number
	let isn: boolean = typeof Object.values(filterObject)[0] === "number";
	let isM: boolean = isMKey(Object.keys(filterObject)[0], idArray, allKeys);
	return isn && isM;
};


const isMKey = (key: string, idArray: string [], allKeys: string []): boolean => {   // "sections_avg"
	const words = key.split("_");
	if (words.length !== 2) {
		return false;
	}
	const mKey = words[0];
	const mField = words[1];
	if (!(mField === "avg" || mField === "pass" || mField === "fail" || mField === "audit" || mField === "year"
	|| mField === "lat" || mField === "lon" || mField === "seats")) {
		return false;
	}
	idArray.push(mKey);
	allKeys.push(mField);
	return true;
};

const isSKey = (key: string, idArray: string [], allKeys: string []): boolean => {  // "sections_dept"
	const words = key.split("_");
	if (words.length !== 2) {
		return false;
	}
	const sKey = words[0];
	const sField = words[1];
	if (!(sField === "dept" || sField === "id" || sField === "instructor" || sField === "title"
		|| sField === "uuid" || sField === "fullname" || sField === "shortname" || sField === "number"
		|| sField === "name" || sField === "address" || sField === "type" || sField === "furniture"
		|| sField === "href")) {
		return false;
	}
	idArray.push(sKey);
	allKeys.push(sField);
	return true;
};

const checkSComparison = (body: any, idArray: string [], allKeys: string []): boolean => {
	if (Object.keys(body).length === 0 || Object.keys(body).length > 1) {
		throw new InsightError("error: invalid SComparison structure");
	}
	// 1.check key is sKey
	// 2. check value is string
	let isValidString: boolean = checkValidString(Object.values(body)[0]);
	let isS: boolean = isSKey(Object.keys(body)[0], idArray, allKeys);
	return isValidString && isS;
};

const checkValidString = (value: unknown): boolean => {
	if (typeof value !== "string") {
		throw new InsightError("error: invalid type in SComparison");
	} else {
		for (let i = 0; i < value.length; i++) {
			if ((i !== 0 && i !== (value.length - 1)) && (value[i] === "*")) {
				throw new InsightError("error: * can only be used at start and end of a string");
			}
		}
	}
	return true;
};


const checkNegation = (body: any, idArray: string [], allKeys: string []): boolean => {
	if (typeof body !== "object") {
		throw new InsightError("NOT must be an object");
	}
	if (Object.keys(body).length === 0 || Object.keys(body).length > 1) {
		throw new InsightError("error: invalid structure in negation");
	}
	return checkFilter(body, idArray, allKeys);
};

const checkOptions = (options: any, idArray: string [], allKeys: string [], transformKeys: string []): boolean => {
	let columnField: string[] = [];
	checkOptionStructure(options);
	checkColumn(options["COLUMNS"], columnField, allKeys, transformKeys, idArray);

	if (Object.keys(options).length === 2) {
		checkOrder(options["ORDER"], columnField);
	}
	return true;
};

const checkOrder = (order: any, columnField: string []) => {
	if (typeof order === "string") {
		if (!columnField.includes(order)) {
			throw new InsightError("error: order key not in COLUMNS");
		}
	} else if (typeof order === "object") {
		if (Object.keys(order).length !== 2) {
			throw new InsightError("error: invalid key structure in order");
		}
		for (let key in order) {
			if (!(key === "dir" || key === "keys")) {
				throw new InsightError("error: invalid key structure in order");
			}
		}
		if (!Object.keys(order).includes("dir") || !Object.keys(order).includes("keys")) {
			throw new InsightError("error: miss dir/keys in order");
		}
		const direction: any = order["dir"];
		if (typeof direction !== "string") {
			throw new InsightError("error: invalid directions type, have to be string");
		}
		if (!(direction === "UP" || direction === "DOWN")) {
			throw new InsightError("error: invalid directions, have to be UP/DOWN");
		}
		const keys: any = order["keys"];
		if (!Array.isArray(keys)) {
			throw new InsightError("error: invalid keys type in order, must be array");
		}
		if (keys.length === 0) {
			throw new InsightError("error: invalid keys type in order, cannot be empty array");
		}
		for (let k of keys) {
			if (!columnField.includes(k)) {
				throw new InsightError("error: all sort key have to be in column");
			}
		}
	} else {
		throw new InsightError("error: order type is invalid");
	}
};

const checkColumn = (columns: any, columnKeys: string [], allKeys: string [], transformKeys: string [],
					 idArray: string []) => {
	if (!Array.isArray(columns)) {
		throw new InsightError("column should be an array");
	}
	const keys: any[] = columns;
	if (keys.length === 0) {
		throw new InsightError("error: cannot have empty array for COLUMNS");
	}
	if (transformKeys.length !== 0) {
		for (let k of keys) {
			if (typeof k !== "string") {
				throw new InsightError("error: unexpected key type in COLUMNS ");
			}
			if (!transformKeys.includes(k)) {
				throw new InsightError("error: all columns key have to be in transformation");
			}else {
				columnKeys.push(k);
			}
		}
	} else {
		for (let k of keys) {
			if (typeof k !== "string") {
				throw new InsightError("error: unexpected key type in COLUMNS ");
			}
			if (isMKey(k, idArray, allKeys) || isSKey(k, idArray, allKeys)) {
				columnKeys.push(k);
			} else {
				throw new InsightError("error: invalid keys in columns");
			}
		}
	}
};

const checkOptionStructure = (options: any) => {
	if (Object.keys(options).length === 0 || Object.keys(options).length > 2) {
		throw new InsightError("error: invalid structure in OPTIONS");
	}
	if (Object.keys(options).length === 1 && Object.keys(options)[0] !== "COLUMNS") {
		throw new InsightError("error: invalid options key");
	}
	if (Object.keys(options).length === 2) {
		if (!Object.keys(options).includes("COLUMNS") || !Object.keys(options).includes("ORDER")) {
			throw new InsightError("error: invalid keys in OPTIONS");
		}
	}
	for (let key in options) {
		if (!(key === "COLUMNS" || key === "ORDER")) {
			throw new InsightError("error: unexpected key in OPTIONS");
		}
	}
};


export {checkWhere, checkOptions, isMKey, isSKey};
