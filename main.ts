import {
	App,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	normalizePath,
	requestUrl,
} from "obsidian";

import { exec } from "child_process";
import axios from "axios";
import FormData from "form-data";
import * as fs from "fs";
import { json } from "stream/consumers";
import { readFile } from "fs/promises";

let ACCESS_TOKEN = process.env.ACCESS_TOKEN
const LIST_COURSE_ASSIGNMENTS = "https://cths.instructure.com/api/v1/courses/";
const LIST_COURSE_ASSIGNMENTS_2 = "/assignments?access_token=";
const LIST_USER_COURSES =
	"https://cths.instructure.com/api/v1/courses?enrollment_type=student&enrollment_state=active&access_token=";

const PANDOC_PATH = "/usr/local/bin/pandoc";
const PDFLATEX_PATH = "/opt/homebrew/bin/pdflatex";

type TAssignemnt = {
	allowed_attempts: number;
	description: string;
	name: string;
	due_at: string;
	due_date_required: string;
	course_id: number;
	id: number;
};

// Remember to rename these classes and interfaces!
interface submit_json_response {
	upload_params: object;
	upload_url: string;
}

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	folder: TFolder;
	newDirectoryPath: string;
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "display-modal",
			name: "Display modal",
			callback: () => {
				new ApiModal(this.app, (result) => {
					new Notice(`Hello, ${result}!`);
				}).open();
			},
		});

		// This creates an icon in the left ribbon.

		const apiRibbonEl = this.addRibbonIcon(
			"dice",
			"Sample Plugin",
			(evt: MouseEvent) => {
				new Notice("Please enter your api key");
			}
		);

		// Perform additional things with the ribbon
		apiRibbonEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// create command to submit current file.
		this.addCommand({
			id: "submit-current-file",
			name: "Submit Current File",
			callback: () => {
				const { workspace } = this.app;
				if (workspace.getActiveFile() !== null) {
					this.submitCurrentFile(workspace.getActiveFile());
				}
			},
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Load Canvas Data",
			callback: () => {
				this.createNewNote("hello world");

				new SampleModal(this.app).open();
			},
		});
		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async submitCurrentFile(file: TFile) {
		const { vault } = this.app;
		const { adapter } = vault;
		//@ts-ignore
		const base_path = adapter.getBasePath();
		const fileContent = await vault.read(file);
		const metadata = fileContent.split("---")[1].split("\n");
		console.log(metadata);

		const paths = `${base_path}/${file.path}`;
		console.log(base_path, paths);

		if (file) {
			// use pandoc to convert markdown file to pdf file before submissions.
			exec(
				`${PANDOC_PATH} --pdf-engine=${PDFLATEX_PATH} '${paths}' -o '${paths.replace(
					".md",
					".pdf"
				)}'`,
				(err, stdout, stderr) => {
					if (err) {
						console.error(err);
					}
					console.log(stdout);
					// TODO: file sucessfully created
				}
			);
		}
		//TODO: After the file is created, I want to submit it to canvas, and then delete the left over pdf file.
		// this.submitToCanvas(paths);
		this.submitToCanvas(
			paths.replace(".md", ".pdf"),
			metadata[1].split(": ")[1],
			metadata[2].split(": ")[1]
		);
		this.testFunc();
	}

	async testFunc() {
		const form = new FormData();
		form.append("filename", "main.pdf");
		form.append("content_type", "pdf");
		const filePath = "/Users/kevinhuang/WebstormProjects/nodejs/main.pdf";

		// Read the file and create a Blob object
		const fileBuffer = await readFile(filePath);
		const fileBlob = new Blob([fileBuffer]);

		// Append the fileBlob to the FormData object
		form.append("file", fileBlob, "main.pdf");

		const token =
			"11644~5p2n81i38xj4Wwlf9tPFvKJAXSekHFufTVthnh8Mes4udNn7ILI8xqp9hh1MjRo4";

		const form1 = new FormData();
		form1.append("name", "main.pdf");
		form1.append("content_type", "pdf");

		let tokenG;

		// first part
		// tell canvas, that I am going to post a file called main.pdf, with type pdf to their servers
		await axios
			.post(
				"https://cths.instructure.com/api/v1/users/self/files",
				form1,
				{
					headers: {
						...form.getHeaders(),
						Authorization: `Bearer ${token}`,
					},
				}
			)
			.then((res) => {
				console.log(res.data.upload_url);
				const baseURl = res.data.upload_url;
				const regex = /token=([^&]+)/;
				const matches = baseURl.match(regex);
				const token = matches && matches[1];
				console.log(token);
				tokenG = token;
				console.log("hello worlfd");
			});
			const requestParams = {
				url: 'https://inst-fs-syd-prod.inscloudgate.net/files' + "?token=" + tokenG,
				method: 'POST',
				body: form.getBuffer(),
				contentType: form.getHeaders()['content-type']
			};
			
			// Make the request using the requestUrl function
			await requestUrl(requestParams)
				.then(res => console.log(res))
				.catch(err => {
					console.error(err.response)
				})
				.finally(() => console.log("function finally ran"));

		// await axios
		// 	.post("https://inst-fs-syd-prod.inscloudgate.net/files", form, {
		// 		params: {
		// 			token: tokenG,
		// 		},
		// 		headers: {
		// 			...form.getHeaders(),
		// 		},
		// 	})
		// 	.catch((err) => console.log(err))
		// 	.then((res) => console.log(res))
		// 	.finally(() => console.log("fuction finally ran"));
	}

	async submitToCanvas(
		fileName: string,
		filePath: string,
		course_id: string,
		assignment_id: string
	) {
		console.log(filePath, course_id, assignment_id);
		let jsonresponse: submit_json_response;
		// Step 1: TODO: Alert Canvas
		const form = new FormData();
		form.append("name", "main.pdf");
		form.append("content_type", "pdf");

		const formdatastring = new URLSearchParams(form).toString();
		console.log(ACCESS_TOKEN);

		await requestUrl({
			url: `https://cths.instructure.com/api/v1/courses/13451/assignments/150837/submissions/self/files`,
			method: "POST",
			body: formdatastring,
			headers: {
				Authorization: `Bearer ${ACCESS_TOKEN}`,
			},
		}).then((res) => {
			jsonresponse = res.json;
			console.log(jsonresponse);
		});

		// Step 2: TODO: upload to Canvas
		const uploadForm = new FormData();
		// for(const key in jsonresponse["upload_params"]) {
		// 	console.log(`${key}, ${jsonresponse['upload_params'][key]}`)
		// 	uploadForm.append(`${key}`, `${jsonresponse["upload_params"][key]}`)
		// }
		uploadForm.append("filename", "main.pdf");
		uploadForm.append("content_type", "pdf");
		uploadForm.append(
			"file",
			fs.createReadStream(
				"/Users/kevinhuang/WebstormProjects/nodejs/main.pdf"
			)
		);

		const uploadFormString = new URLSearchParams(uploadForm).toString();
		console.log([jsonresponse.upload_url]);
		console.log(typeof uploadFormString);

		await requestUrl({
			url: jsonresponse.upload_url,
			method: "POST",
			body: uploadFormString,
			contentType: "multipart/form-data",
		})
			.catch((err) => console.log(err))
			.then((res) => console.log(res))
			.finally(() => console.log("fuction finally ran"));

		// await requestUrl(
		// 	`cths.instructure.com/api/v1/courses/${course_id}/assignments/${assignment_id}/submissions/self/files`
		// ).then((res) => {
		// 	console.log(res);
		// });

		return;
	}

	// create new paths for each course
	async createDirectory(dir: string): Promise<void> {
		const { vault } = this.app;
		const { adapter } = vault;

		const root = vault.getRoot().path;

		const dirPath = root + dir;

		const directoryExists = await adapter.exists(dirPath);

		if (!directoryExists) {
			return adapter.mkdir(normalizePath(dirPath));
		}
	}

	async createNewNote(input: string): Promise<any> {
		await this.createDirectory("Courses");
		const { vault, workspace } = this.app;
		const { adapter } = vault;
		let leaf = workspace.getLeaf(false);
		// let courseData: Array<object>;
		// console.log(vault, adapter);
		let fetchData;
		let fileContents = "";

		await this.getCanvasData("kevin huang").then((data) => {
			const arrayData = Object.values(data);
			fetchData = arrayData;
			arrayData.map((courseDataFetch, idx) => {
				fileContents += `Course [[${courseDataFetch.name}]] \n`;
			});
		});
		// create the root directorys
		if (fetchData && fetchData !== undefined) {
			for (const sub_path of fetchData) {
				await this.createDirectory("Courses/" + sub_path.name);
				let courseAssignmentData;
				let list_of_assignments = "# Assignments \n --- \n";
				const dirExists = await adapter.exists(
					"Courses/" + sub_path.name
				);
				console.log(dirExists); // because it is a folder
				if (dirExists) {
					console.log("file created at /Courses/", sub_path.name);
					courseAssignmentData = await this.getCourseData(
						sub_path.id
					);
					if (courseAssignmentData.json) {
						const assignmentData = courseAssignmentData.json;
						assignmentData.map((assignment: TAssignemnt) => {
							console.log(assignment);
							list_of_assignments += `[[${assignment.name}]]\n`;
							vault.create(
								`Courses/${sub_path.name}/${assignment.name}.md`,
								`---\ncourseID: ${assignment.course_id}\nassignmentID: ${assignment.id}\n---\n${assignment.description}`
							);
						});
					}
					// console.log(`Courses/${sub_path.name}/main.md`, list_of_assignments)
					// await vault.create(`Courses/${sub_path.name}/main.md`, list_of_assignments)
					// TODO: find out how to submit the file through the file submission api.
				}
			}
		}
		// console.log(fileContents);
		// courseData.map((content) => {
		// 	fileContents += content.name
		// })
		const filePath = "./canvasCourses.md";

		const folder_or_file = vault.getAbstractFileByPath("canvasCourses.md");
		if (folder_or_file === undefined || folder_or_file === null) {
			vault.create(filePath, fileContents);
		} else {
			// dete the file and start over
			await vault.delete(folder_or_file);
			await vault.create(filePath, fileContents);
		}

		// const File = await vault.create(filePath, fileContents);
		// return File;

		// const filePath = './helloworld2.md';
		// const File = await vault.create(filePath, "# hello world");
	}
	async getCourseData(courseID: string): Promise<object> {
		const url = `${LIST_COURSE_ASSIGNMENTS}/${courseID}/${LIST_COURSE_ASSIGNMENTS_2}${ACCESS_TOKEN}`;
		console.log(url);
		const courseData = await requestUrl(url);

		return courseData;
	}

	async getCanvasData(userID: string): Promise<object> {
		// TODO: Find out why i cannot call this api from obsidian.md, but I can from my page.
		const url = `${LIST_USER_COURSES}${ACCESS_TOKEN}`;
		console.log(url);
		const courseData = await requestUrl(
			`${LIST_USER_COURSES}${ACCESS_TOKEN}`
		);
		const data = courseData.json.slice(0, 6);
		return data;
	}
	async getAnnouncementData(courseID: string): Promise<object> {
		console.log("fetching assignments");
		const url = ``;
		const annoucementData_forCourse = await requestUrl(url);
		return annoucementData_forCourse;
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Hello world!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

class ApiModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;
	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		console.log(contentEl);
		contentEl.setText("Look at me, I am a modal");

		contentEl.createEl("h1", { text: "Enter your api key" });

		new Setting(contentEl)
			.setName("Enter your api keys")
			.addText((text) => {
				text.onChange((val) => {
					this.result = val;
				});
			});

		new Setting(contentEl).addButton((btn) => {
			btn.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.close();
					ACCESS_TOKEN = this.result;
					this.onSubmit(this.result);
				});
		});
	}
	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
