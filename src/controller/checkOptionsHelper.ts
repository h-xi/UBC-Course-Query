import {InsightError} from "./IInsightFacade";

const checkOptions = (options: any, idArray: string []): boolean => {
	let columnField: string[] = [];
	if (Object.keys(options).length === 0 || Object.keys(options).length > 2) {
		throw new InsightError("error: invalid structure in OPTIONS");
	}
	for (let key in options) {
		if (!(key === "COLUMNS" || key === "ORDER")) {
			throw new InsightError("error: unexpected key in OPTIONS");
		}
		if (key === "COLUMNS") {
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

export {checkOptions};
