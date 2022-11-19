const filterDataSet = (filter: any, dataSet: any[]|undefined): any[] => {
	const key = Object.keys(filter)[0];
	if (key === "LT" || key === "GT" || key === "EQ") {
		return filterMComparison(filter, key, dataSet);
	}
	if (key === "IS") {
		return filterSComparison(filter, dataSet);
	}
	if (key === "AND") {
		return filterAnd(filter, dataSet);
	}
	if (key === "OR") {
		return filterOr(filter, dataSet);
	}
	if (key === "NOT") {
		return filterNot(filter, dataSet);
	}
	if (typeof dataSet !== "undefined") {
		return dataSet;
	} else {
		return [];
	}
};

const filterNot = (filter: any, dataSet: any[]|undefined): any[] => {
	let filterNotArray: any [] = [];
	let notFilter = filter["NOT"];
	let notArray = filterDataSet(notFilter, dataSet);
	if (typeof dataSet !== "undefined") {
		for (let section of dataSet) {
			if (!notArray.includes(section)) {
				filterNotArray.push(section);
			}
		}
	}
	return filterNotArray;
};


const filterOr = (filter: any, dataSet: any[]|undefined): any [] => {
	let filteredOrArray: any [] = [];
	const filterArray = filter["OR"];
	let allFilterResultArray: any [] = [];
	for (let f of filterArray) {
		allFilterResultArray.push(filterDataSet(f, dataSet));
	}
	for (let eachArray of allFilterResultArray) {
		for (let section of eachArray) {
			if (!filteredOrArray.includes(section)) {
				filteredOrArray.push(section);
			}
		}
	}
	return filteredOrArray;
};


const filterAnd = (filter: any, dataSet: any[]|undefined): any [] => {
	let filteredAndArray = [];
	const filterArray = filter["AND"];
	let allFilterResultArray = []; // array of filter result arrays
	for (let f of filterArray) {
		allFilterResultArray.push(filterDataSet(f, dataSet));
	}
	let firstArray = allFilterResultArray[0];
	for (let section of firstArray) {
		if (checkInAllOthers(section, allFilterResultArray)) {
			filteredAndArray.push(section);
		}
	}
	return filteredAndArray;
};

const checkInAllOthers = (oneSection: any, allArrays: any []): boolean => {
	let counter: number = 0;
	for (let eachArray of allArrays) {
		if (eachArray.includes(oneSection)) {
			counter++;
		}
	}
	return counter === allArrays.length;
};

const checkWildcards = (sectionString: string, filterString: string): boolean => {
	if (sectionString === filterString || filterString === "*") {
		return true;
	}
	if (filterString[0] === "*" && filterString[filterString.length - 1] !== "*") {
		filterString = filterString.substring(1, filterString.length);
		return sectionString.endsWith(filterString);
	}
	if (filterString[filterString.length - 1] === "*" && filterString[0] !== "*") {
		filterString = filterString.substring(0, filterString.length - 1);
		return sectionString.startsWith(filterString);
	}
	if (filterString[filterString.length - 1] === "*" && filterString[0] === "*"){
		filterString = filterString.substring(1, filterString.length - 1);
		return sectionString.includes(filterString);
	}
	return false;
};

const SPushHelper = (sField: string, dataset: any[], filterString: string, filteredArray: any []): any [] => {
	for (let section of dataset) {
		if (checkWildcards(section[sField], filterString)) {
			filteredArray.push(section);
		}
	}
	return filteredArray;
};


const filterSComparison = (filter: any, dataset: any[]|undefined) => {
	let filteredISArray: any[] = [];
	let sKey = filter["IS"];
	let idAndSField = Object.keys(sKey)[0];
	let filterString: string = sKey[idAndSField];
	let sField = idAndSField.split("_")[1]; // eg: "dept"
	if (typeof dataset !== "undefined") {
		filteredISArray = SPushHelper(sField, dataset, filterString, filteredISArray);
	}
	return filteredISArray;
};

const filterMComparison = (filter: any, key: string, dataSet: any[]|undefined): any[] => {
	if (key === "LT") {
		return filterLT(filter, dataSet);
	}
	if (key === "GT") {
		return filterGT(filter, dataSet);
	}
	if (key === "EQ") {
		return filterEQ(filter, dataSet);
	}
	return [];
};

const NumberPushHelper = (mField: string, dataset: any[], filterNumber: number, filteredArray: any [],
						  compare: string): any [] => {
	if (compare === "LT") {
		for (let section of dataset) {
			if (section[mField] < filterNumber) {
				filteredArray.push(section);
			}
		}
	} else if (compare === "GT") {
		for (let section of dataset) {
			if (section[mField] > filterNumber) {
				filteredArray.push(section);
			}
		}
	} else {
		for (let section of dataset) {
			if (section[mField] === filterNumber) {
				filteredArray.push(section);
			}
		}
	}
	return filteredArray;
};

const filterLT = (filter: any, dataset: any[]|undefined) => {
	let filteredLTArray: any [] = [];
	let mKey = filter["LT"];  // eg: {"sections_avg":97}
	let idAndMField = Object.keys(mKey)[0]; // eg: {"sections_avg"}
	let filterNumber: number = mKey[idAndMField];
	let mField = idAndMField.split("_")[1]; // eg: "avg"
	if (typeof dataset !== "undefined") {
		filteredLTArray = NumberPushHelper(mField, dataset, filterNumber, filteredLTArray, "LT");
	}
	return filteredLTArray;
};

const filterGT = (filter: any, dataset: any[]|undefined) => {
	let filteredGTArray: any[] = [];
	let mKey = filter["GT"];  // eg: {"sections_avg":97}
	let idAndMField = Object.keys(mKey)[0]; // eg: {"sections_avg"}
	let filterNumber: number = mKey[idAndMField];
	let mField = idAndMField.split("_")[1]; // eg: "avg"
	if (typeof dataset !== "undefined") {
		filteredGTArray = NumberPushHelper(mField, dataset, filterNumber, filteredGTArray, "GT");
	}
	return filteredGTArray;
};

const filterEQ = (filter: any, dataset: any[]|undefined) => {
	let filteredEQArray: any[] = [];
	let mKey = filter["EQ"];  // eg: {"sections_avg":97}
	let idAndMField = Object.keys(mKey)[0]; // eg: {"sections_avg"}
	let filterNumber: number = mKey[idAndMField];
	let mField = idAndMField.split("_")[1]; // eg: "avg"
	if (typeof dataset !== "undefined") {
		filteredEQArray = NumberPushHelper(mField, dataset, filterNumber, filteredEQArray, "EQ");
	}
	return filteredEQArray;
};

export {filterDataSet};
