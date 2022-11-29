import InsightFacade from "../controller/InsightFacade";
import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "../controller/IInsightFacade";
import {Request, Response} from "express";

const facade: IInsightFacade = new InsightFacade();

const postHandler = (req: Request, res: Response) => {
	console.log(`Server::postHandler(..) - params: ${JSON.stringify(req.body)}`);
	facade.performQuery(req.body).then(function(queryResult: InsightResult[]) {
		res.status(200).json({result: queryResult});
	}).catch(function (queryError: InsightError | ResultTooLargeError) {
		res.status(400).json({error: queryError.message});
	});
};

export {postHandler};
