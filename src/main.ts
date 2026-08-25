import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app/app.config";
import { DESIGN_SYSTEM_TAG } from "./app/design-system/design-system.host";

/**
 * The design system reference lives at /design (or ?design). It is loaded with a
 * dynamic import so it stays in its own chunk and never ships inside the
 * workbench bundle.
 *
 * Deliberately not a router route: the router is currently inert and AppComponent
 * *is* the workbench, so a real route would mean restructuring it into a shell.
 * See docs/DESIGN_SYSTEM.md DEC-16.
 */
function wantsDesignSystem(): boolean {
	const path = window.location.pathname.replace(/\/+$/, "");
	return (
		path.endsWith("/design") ||
		new URLSearchParams(window.location.search).has("design")
	);
}

async function boot() {
	if (wantsDesignSystem()) {
		const { DesignSystem } = await import("./app/design-system/design-system");
		// bootstrapApplication matches the component's selector against the live
		// DOM, and index.html only ships <app-root>. Without a matching host
		// Angular throws NG05104 onto a blank page.
		document
			.querySelector("app-root")
			?.replaceWith(document.createElement(DESIGN_SYSTEM_TAG));
		return bootstrapApplication(DesignSystem, appConfig);
	}
	return bootstrapApplication(AppComponent, appConfig);
}

boot().catch((err) => console.error(err));
