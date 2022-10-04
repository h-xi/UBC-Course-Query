import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import chai, {expect} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {folderTest} from "@ubccpsc310/folder-test";

chai.use(chaiAsPromised);

type Input = unknown;
type Output = Promise<InsightResult[]>;
type Error = "InsightError" | "ResultTooLargeError";

// Code of test of listDatasets is from video "Mutant killing demo" from link attached in
// 2022 WT1 CPSC310 piazza:https://piazza.com/class/l7qenrnq7oy512/post/11

describe("InsightFacade", function() {
	let sections: string;

	before(function () {
		sections = getContentFromArchives("pair.zip");
	});  // the content of the test dataset to add

	describe("List Datasets", function() {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should list no dataset", function () {
			return facade.listDatasets().then((insightDatasets) => {  // return to wait for async task
				expect(insightDatasets).to.be.an.instanceof(Array);    // to.deep.equal
				expect(insightDatasets).to.have.length(0);
			});
		});

		it("should list one dataset", function () {
			// 1. Add a dataset
			// 2. list datasets again
			return facade.addDataset("sections", sections, InsightDatasetKind.Sections)
				.then((addedIds) => facade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([{
						id: "sections",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					}]);
					// expect(insightDatasets).to.be.an.instanceof(Array);
					// expect(insightDatasets).to.have.length(1);
					// const [newDataset] = insightDatasets;
					// expect(newDataset).to.have.property("id");
					// expect(newDataset.id).to.equal("sections");
				});
		});

		it("should list multiple datasets", function () {
			return facade.addDataset("sections", sections, InsightDatasetKind.Sections)
				.then(() => {
					return facade.addDataset("sections-2", sections, InsightDatasetKind.Sections);
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					const expectedDatasets: InsightDataset[] = [
						{
							id: "sections",
							kind: InsightDatasetKind.Sections,
							numRows: 64612,
						},
						{
							id: "sections-2",
							kind: InsightDatasetKind.Sections,
							numRows: 64612,
						}
					];
					expect(insightDatasets).to.have.deep.members(expectedDatasets);
					expect(insightDatasets).to.have.length(2);

					// expect(insightDatasets).to.be.an.instanceof(Array);
					// expect(insightDatasets).to.have.length(2);
					// const insightDatasetSections =
					//     insightDatasets.find((dataset) => dataset.id === "sections");
					// expect(insightDatasetSections).to.exist;
					// expect(insightDatasetSections).to.deep.equal({
					//     id: "sections",
					//     kind: InsightDatasetKind.Sections,
					//     numRows: 64612,
					// });
				});
		});
	});

	describe("Add Datasets", function() {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should add one dataset", function () {
			return facade.addDataset("sections", sections, InsightDatasetKind.Sections)
				.then((ids) => {
					expect(ids).to.be.an.instanceof(Array);
					expect(ids).to.have.length(1);
					expect(ids).to.deep.equal(["sections"]);
				});
		});

		it("should reject with InsightError if dataset with repeat id", async function () {
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			try {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				expect.fail("Dataset with same Id already exist");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject with InsightError if dataset id contains an underscore", function () {
			const result = facade.addDataset("sections_", sections, InsightDatasetKind.Sections);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject with InsightError if dataset id is only whitespace characters", function () {
			const result = facade.addDataset("  ", sections, InsightDatasetKind.Sections);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject with InsightError if dataset is not valid", async function () {
			let invalidContent = getContentFromArchives("invalidDataset.zip");
			try {
				await facade.addDataset("invalidDataset", invalidContent, InsightDatasetKind.Sections);
				expect.fail("dataset is invalid");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

	});

	describe("Remove Datasets", function() {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("should remove one dataset", function () {
			return facade.addDataset("sections", sections, InsightDatasetKind.Sections)
				.then((ids) => {
					return facade.removeDataset("sections");
				})
				.then((removeId) => {
					expect(removeId).to.be.deep.equal("sections");
				});
		});

		it("should reject with NotFoundError if try to remove a dataset hasn't been added yet", function () {
			const result = facade.removeDataset("sections");
			return expect(result).eventually.to.be.rejectedWith(NotFoundError);
		});

		it("should reject with InsightError if remove dataset id contains an underscore", function () {
			const result = facade.removeDataset("sections_");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject with InsightError if remove dataset id is only whitespace characters", function () {
			const result = facade.removeDataset("  ");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});

	});

	describe("Dynamic folder test", function () {
		let facade: IInsightFacade;

		before(async function () {
			clearDisk();
			facade = new InsightFacade();
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			await facade.addDataset("sections2", sections, InsightDatasetKind.Sections);
		});

		function assertResult(actual: any, expected: InsightResult[], input: unknown): void {
			expect(actual).to.have.deep.members(expected);
		}

		folderTest<Input, Output, Error>(
			"test Query",
			async (input: Input): Output => {
				return await facade.performQuery(input);
			},
			"./test/resources/queries",
			{
				assertOnResult: assertResult,
				errorValidator: (error): error is Error =>
					error === "InsightError" || error === "ResultTooLargeError",
				assertOnError: (actual: any, expected: Error, input: unknown) => {
					if (expected === "InsightError") {
						expect(actual).to.be.an.instanceof(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(actual).to.be.an.instanceof(ResultTooLargeError);
					} else {
						expect.fail("Unexpected error");
					}
				}
			}
		);

	});


});
