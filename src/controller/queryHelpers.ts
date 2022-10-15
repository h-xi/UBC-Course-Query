import {InsightError} from "./IInsightFacade";

const checkWhere = (body: any, idArray: string []): boolean => {
	if (typeof body === "object") {
		if (Object.keys(body).length === 0) {
			return true;
		} else if (Object.keys(body).length > 1) {
			throw new InsightError("error: invalid WHERE structure");
		}
		return checkFilter(body, idArray);
	} else {
		throw new InsightError("where must be object");
	}
};

const checkFilter = (body: any, idArray: string []): boolean => {
	for (let key in body) {
		if (key === "AND" || key === "OR") {
			let resultLogicCheck = checkLogic(body, key, idArray);
			return resultLogicCheck;
		} else if (key === "LT" || key === "GT" || key === "EQ") {
			let resultMComparisonCheck = checkMComparison(body[key], idArray);
			return resultMComparisonCheck;
		} else if (key === "IS") {
			let resultSComparisonCheck = checkSComparison(body[key], idArray);
			return resultSComparisonCheck;
		} else if (key === "NOT") {
			let resultNegationCheck = checkNegation(body[key], idArray);
			return resultNegationCheck;
		} else {
			throw new InsightError("error: unexpected key in WHERE");
		}
	}
	return true; // change this
};

const checkLogic = (body: any, key: string, idArray: string []): boolean => {
	if (!Array.isArray(body[key])) {
		throw new InsightError("OR must be an array");
	}
	let objectArray = body[key];
	let counter: number = 0;
	if (objectArray.length === 0) {
		throw new InsightError("error: invalid logic key structure");
	} else {
		for (let i of objectArray) {
			if (typeof i === "object") {
				if (checkFilter(i, idArray)) {
					counter++;
				}
			} else {
				throw new InsightError("OR should be an object array");
			}
		}
		return counter === objectArray.length;
	}
};

const checkMComparison = (filterObject: any, idArray: string []): boolean => {
	if (Object.keys(filterObject).length === 0 || Object.keys(filterObject).length > 1) {
		throw new InsightError("error: invalid MComparison structure");
	}
	// 1.check key is mKey
	// 2. check value is number
	let isn: boolean = typeof Object.values(filterObject)[0] === "number";
	let isM: boolean = isMKey(Object.keys(filterObject)[0], idArray);
	return isn && isM;
};

const isMKey = (key: string, idArray: string []): boolean => {   // "sections_avg"
	const words = key.split("_");
	if (words.length !== 2) {
		throw new InsightError("error: invalid key:" + key);
	}
	const mKey = words[0];
	idArray.push(mKey);
	const mField = words[1];
	if (!(mField === "avg" || mField === "pass" || mField === "fail" || mField === "audit" || mField === "year")) {
		throw new InsightError("error: invalid field:" + mField);
	}
	return true;
};

const isSKey = (key: string, idArray: string []): boolean => {  // "sections_dept"
	const words = key.split("_");
	if (words.length !== 2) {
		throw new InsightError("error: invalid key:" + key);
	}
	const sKey = words[0];
	idArray.push(sKey);
	const sField = words[1];
	if (!(sField === "dept" || sField === "id" || sField === "instructor" || sField === "title"
		|| sField === "uuid")) {
		throw new InsightError("error: invalid field:" + sField);
	}
	return true;
};

const checkSComparison = (body: any, idArray: string []): boolean => {
	if (Object.keys(body).length === 0 || Object.keys(body).length > 1) {
		throw new InsightError("error: invalid SComparison structure");
	}
	// 1.check key is sKey
	// 2. check value is string
	let isValidString: boolean = checkValidString(Object.values(body)[0]);
	let isS: boolean = isSKey(Object.keys(body)[0], idArray);
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


const checkNegation = (body: any, idArray: string []): boolean => {
	if (typeof body !== "object") {
		throw new InsightError("NOT must be an object");
	}
	if (Object.keys(body).length === 0 || Object.keys(body).length > 1) {
		throw new InsightError("error: invalid structure in negation");
	}
	return checkFilter(body, idArray);
};

const checkOptions = (options: any, idArray: string []): boolean => {
	let columnField: string[] = [];
	checkOptionStructure(options);
	for (let key in options) {
		if (!(key === "COLUMNS" || key === "ORDER")) {
			throw new InsightError("error: unexpected key in OPTIONS");
		}
		if (key === "COLUMNS") {
			checkColumn(options);
			const keys: any[] = options["COLUMNS"];
			if (keys.length === 0) {
				throw new InsightError("error: cannot have empty array for COLUMNS");
			}
			for (let k of keys) {
				if (typeof k !== "string") {
					throw new InsightError("error: unexpected key type in COLUMNS ");
				}
				const words = k.split("_");
				if (words.length !== 2) {
					throw new InsightError("error: invalid key:" + k);
				}
				idArray.push(words[0]);
				const field = words[1];
				if (!(field === "dept" || field === "id" || field === "instructor" || field === "title"
					|| field === "uuid" || field === "avg" || field === "pass" || field === "fail"
					|| field === "audit" || field === "year")) {
					throw new InsightError("error: invalid field:" + field);
				}
				columnField.push(field);
			}
		}
	}
	if (Object.keys(options).length === 2) {
		const orderKey = options["ORDER"];
		if (typeof orderKey !== "string") {
			throw new InsightError("error: invalid order key type");
		}
		const words = orderKey.split("_");
		if (words.length !== 2) {
			throw new InsightError("error: invalid order key:" + orderKey);
		}
		idArray.push(words[0]);
		const orderField: string = words[1];
		if (!columnField.includes(orderField)) {
			throw new InsightError("error: order key not in COLUMNS");
		}
	}
	return true;
};

const checkOptionStructure = (options: any) => {
	if (Object.keys(options).length === 0 || Object.keys(options).length > 2) {
		throw new InsightError("error: invalid structure in OPTIONS");
	}
};

const checkColumn = (options: any) => {
	if (!Array.isArray(options["COLUMNS"])) {
		throw new InsightError("column should be an array");
	}
};

export {checkWhere, checkOptions};
