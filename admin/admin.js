(() => {
    const state = {
        page: "overview",
        subscriberPage: 1,
        subscriberTotal: 0,
        activityPage: 1,
        activityTotal: 0,
        eligible: null,
        session: null,
        campaignKey: null,
        submission: null,
        searchTimer: null,
        campaignRunning: false
    };

    const byId = (id) => document.getElementById(id);
    const show = (element, message, type = "") => {
        element.textContent = message;
        element.classList.toggle("is-error", type === "error");
        element.classList.toggle("is-success", type === "success");
    };
    const formatDate = (value) => {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "—"
            : new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                ...(date.getHours() || date.getMinutes() ? { timeStyle: "short" } : {})
            }).format(date);
    };
    const shortDate = (value) => {
        if (!value) return "";
        const date = new Date(`${value}T12:00:00`);
        return Number.isNaN(date.getTime())
            ? ""
            : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
    };
    const make = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = String(text);
        return element;
    };
    const cell = (text, className) => make("td", className, text);
    const statusPill = (status) => {
        const pill = make("span", `status-pill is-${String(status || "").toLowerCase()}`, status || "unknown");
        return pill;
    };
    const csvCell = (value) => {
        const text = String(value ?? "");
        const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
        return `"${safeText.replace(/"/g, '""')}"`;
    };

    function applyTheme(theme, persist = false) {
        const isDark = theme === "dark";
        document.documentElement.dataset.theme = isDark ? "dark" : "light";
        const toggle = byId("theme-toggle");
        toggle.setAttribute("aria-pressed", String(isDark));
        toggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
        byId("theme-icon").textContent = isDark ? "☀" : "☾";
        byId("theme-label").textContent = isDark ? "Light mode" : "Dark mode";
        if (persist) {
            try {
                localStorage.setItem("promptcv_admin_theme", isDark ? "dark" : "light");
            } catch {
                setGlobalMessage("Theme changed for this visit, but the preference could not be saved.", "error");
            }
        }
    }

    try {
        applyTheme(localStorage.getItem("promptcv_admin_theme") === "dark" ? "dark" : "light");
    } catch {
        applyTheme("light");
    }

    try {
        const saved = JSON.parse(localStorage.getItem("promptcv_campaign_submission") || "null");
        if (saved && typeof saved.idempotency_key === "string"
            && typeof saved.subject === "string" && typeof saved.body === "string") {
            state.submission = saved;
            state.campaignKey = saved.idempotency_key;
            byId("campaign-subject").value = saved.subject;
            byId("campaign-preview").value = saved.preview_text || "";
            byId("campaign-body").value = saved.body;
            byId("campaign-subject").disabled = true;
            byId("campaign-preview").disabled = true;
            byId("campaign-body").disabled = true;
        }
    } catch {
        localStorage.removeItem("promptcv_campaign_submission");
    }

    async function api(action, method = "GET", body) {
        const options = {
            method,
            credentials: "same-origin",
            headers: { Accept: "application/json" }
        };
        if (body !== undefined) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }
        let response;
        try {
            response = await fetch(`/api/admin?action=${encodeURIComponent(action)}`, options);
        } catch {
            throw new Error("The admin API could not be reached. Start the site with `vercel dev` and open http://localhost:3000/admin.");
        }
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
            throw new Error("The admin API is not running at this address. Live Server only serves static files; start the site with `vercel dev` and open http://localhost:3000/admin.");
        }
        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error("The admin API returned invalid JSON. Restart `vercel dev` and try again.");
        }
        if (!response.ok) throw new Error(result.error || "The request could not be completed");
        return result;
    }

    function setGlobalMessage(message, type = "") {
        const element = byId("global-message");
        element.hidden = !message;
        element.textContent = message || "";
        element.classList.toggle("is-error", type === "error");
    }

    function showLogin(message = "") {
        byId("dashboard-view").hidden = true;
        byId("login-view").hidden = false;
        if (message) show(byId("login-message"), message, "error");
    }

    function showDashboard(session) {
        state.session = session;
        byId("login-view").hidden = true;
        byId("dashboard-view").hidden = false;
        byId("admin-email").textContent = session.email;
        byId("settings-email").textContent = session.email;
    }

    function switchView(view) {
        const titles = {
            overview: "Overview",
            waitlist: "Waitlist",
            broadcast: "Launch Broadcast",
            analytics: "Analytics",
            activity: "Email Activity",
            settings: "Settings"
        };
        if (!titles[view]) return;
        state.page = view;
        byId("page-title").textContent = titles[view];
        document.querySelectorAll("[data-panel]").forEach((panel) => {
            panel.hidden = panel.dataset.panel !== view;
        });
        document.querySelectorAll(".nav-item").forEach((button) => {
            const active = button.dataset.view === view;
            button.classList.toggle("is-active", active);
            if (active) button.setAttribute("aria-current", "page");
            else button.removeAttribute("aria-current");
        });
        setGlobalMessage("");
        loadView(view);
    }

    async function loadView(view) {
        try {
            if (view === "overview") await loadOverview();
            if (view === "waitlist") await loadSubscribers();
            if (view === "broadcast") await loadAudience();
            if (view === "activity") await loadActivity();
            if (view === "settings") await loadSettings();
        } catch (error) {
            setGlobalMessage(error.message, "error");
        }
    }

    function renderMetric(label, value, note) {
        const card = make("article", "metric-card");
        card.append(make("p", "metric-label", label), make("p", "metric-value", value), make("p", "metric-note", note));
        return card;
    }

    async function loadOverview() {
        const data = await api("overview");
        const cards = byId("overview-cards");
        cards.replaceChildren(
            renderMetric("Total subscribers", data.total_subscribers, `${data.active_subscribers} active and consented`),
            renderMetric("New in 7 days", data.new_last_7_days, "Rolling 7 × 24 hours (UTC)"),
            renderMetric("New in 30 days", data.new_last_30_days, "Rolling 30 × 24 hours (UTC)"),
            renderMetric("Email alerts to review", Number(data.pending_notifications) + Number(data.failed_notifications),
                `${data.pending_notifications} pending · ${data.failed_notifications} failed`)
        );

        const warnings = byId("overview-warnings");
        warnings.replaceChildren();
        const analyticsWarning = make("div", "notice notice-warning",
            "Analytics not configured — visitor and session totals are unavailable. No traffic metrics are fabricated.");
        warnings.append(analyticsWarning);
        if (Number(data.failed_notifications) > 0) {
            warnings.append(make("div", "notice notice-danger",
                `${data.failed_notifications} signup notification${data.failed_notifications === 1 ? "" : "s"} failed. Review Email Activity for the recorded reason.`));
        }
        if (Number(data.pending_notifications) > 0) {
            warnings.append(make("div", "notice notice-warning",
                `${data.pending_notifications} signup notification${data.pending_notifications === 1 ? "" : "s"} still pending provider configuration or delivery.`));
        }

        renderTrend(data.signup_trend || []);
        renderLatestCampaign(data.latest_campaign);
        renderRecentSignups(data.recent_signups || []);
        renderRecentActivity(data.recent_activity || []);
    }

    function renderTrend(items) {
        const chart = byId("signup-trend");
        chart.replaceChildren();
        const maximum = Math.max(1, ...items.map((item) => Number(item.count) || 0));
        items.forEach((item, index) => {
            const column = make("div", "trend-column");
            column.setAttribute("aria-label", `${item.date}: ${item.count} signups`);
            const value = make("span", "trend-value", item.count);
            const bar = make("span", `trend-bar${index === items.length - 1 ? " is-today" : ""}`);
            bar.style.height = `${Math.max(3, ((Number(item.count) || 0) / maximum) * 83)}px`;
            bar.title = `${item.count} signups`;
            column.append(value, bar, make("span", "trend-date", index % 5 === 0 || index === items.length - 1 ? shortDate(item.date) : ""));
            chart.append(column);
        });
    }

    function renderLatestCampaign(campaign) {
        const target = byId("latest-campaign");
        target.replaceChildren();
        if (!campaign) {
            target.textContent = "No launch campaign has been created.";
            return;
        }
        const content = make("div", "list-row");
        const left = make("div");
        left.append(make("div", "list-primary", campaign.subject), make("div", "list-secondary",
            `${campaign.audience_count} eligible · ${formatDate(campaign.created_at)}`));
        content.append(left, statusPill(campaign.status));
        target.append(content);
    }

    function renderRecentSignups(items) {
        const target = byId("recent-signups");
        target.replaceChildren();
        if (!items.length) {
            target.append(make("p", "empty-state", "No waitlist signups yet."));
            return;
        }
        items.forEach((item) => {
            const row = make("div", "list-row");
            const left = make("div");
            left.append(make("div", "list-primary", item.email), make("div", "list-secondary", formatDate(item.created_at)));
            row.append(left, statusPill(item.status));
            target.append(row);
        });
    }

    function renderRecentActivity(items) {
        const target = byId("recent-activity");
        target.replaceChildren();
        if (!items.length) {
            target.append(make("p", "empty-state", "No notification activity yet."));
            return;
        }
        items.forEach((item) => {
            const row = make("div", "list-row");
            const left = make("div");
            left.append(make("div", "list-primary", item.email), make("div", "list-secondary", formatDate(item.created_at)));
            row.append(left, statusPill(item.status));
            target.append(row);
        });
    }

    async function loadSubscribers() {
        const search = byId("subscriber-search").value.trim();
        const status = byId("subscriber-status").value;
        const sort = byId("subscriber-sort").value;
        const params = new URLSearchParams({
            action: "subscribers",
            page: String(state.subscriberPage),
            sort
        });
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        const response = await fetch(`/api/admin?${params}`, { credentials: "same-origin" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Waitlist could not be loaded");
        state.subscriberTotal = data.total;
        byId("subscriber-count").textContent = `${data.filtered_total} matching · ${data.total} total in selected status`;
        byId("subscriber-page-label").textContent = data.filtered_total
            ? `Page ${data.page} of ${Math.ceil(data.filtered_total / data.page_size)}`
            : "No results";
        byId("subscribers-previous").disabled = data.page <= 1;
        byId("subscribers-next").disabled = data.page * data.page_size >= data.filtered_total;

        const target = byId("subscriber-rows");
        target.replaceChildren();
        if (!data.rows.length) {
            const row = make("tr");
            const empty = cell(search ? "No subscribers match this search." : "There are no subscribers in this view.");
            empty.colSpan = 4;
            empty.className = "empty-state";
            row.append(empty);
            target.append(row);
            return;
        }
        data.rows.forEach((subscriber) => {
            const row = make("tr");
            row.append(cell(subscriber.email), cell(formatDate(subscriber.created_at)));
            const consent = cell();
            consent.append(statusPill(subscriber.status));
            const consentNote = make("span", "sub-cell", subscriber.consent_status ? "Consent recorded" : "No active consent");
            consent.append(consentNote);
            const launch = cell();
            launch.textContent = subscriber.launch_notified_at
                ? `Accepted ${formatDate(subscriber.launch_notified_at)}`
                : "Not recorded";
            row.append(consent, launch);
            target.append(row);
        });
    }

    async function exportEligibleSubscribers() {
        const button = byId("export-csv");
        const message = byId("export-message");
        button.disabled = true;
        show(message, "Preparing eligible subscriber export…");
        try {
            let page = 1;
            let pageCount = 1;
            const contacts = [];
            while (page <= pageCount) {
                const params = new URLSearchParams({ action: "subscribers", page: String(page), status: "active" });
                const response = await fetch(`/api/admin?${params}`, { credentials: "same-origin" });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Export could not be prepared");
                pageCount = Math.ceil(result.filtered_total / result.page_size);
                contacts.push(...result.rows.filter((row) => row.status === "active" && row.consent_status === true));
                page += 1;
            }
            const lines = [
                ["Email address", "Signup date", "Consent status"].map(csvCell).join(","),
                ...contacts.map((contact) => [
                    contact.email,
                    contact.created_at,
                    contact.consent_status ? "consented" : "not consented"
                ].map(csvCell).join(","))
            ];
            const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = make("a");
            link.href = url;
            link.download = "promptcv-eligible-subscribers.csv";
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            show(message, `Exported ${contacts.length} eligible subscriber${contacts.length === 1 ? "" : "s"}.`, "success");
        } catch (error) {
            show(message, error.message, "error");
        } finally {
            button.disabled = false;
        }
    }

    async function loadAudience() {
        const data = await api("audience");
        state.eligible = data.eligible;
        byId("eligible-count").textContent = data.eligible.toLocaleString();
        byId("send-campaign").disabled = data.eligible < 1 || state.campaignRunning;
        if (state.submission && !state.campaignRunning) {
            byId("confirm-subject").textContent = state.submission.subject;
            byId("confirm-count").textContent = data.eligible.toLocaleString();
            byId("confirm-title").textContent = "Resume launch email confirmation";
            byId("confirm-send").textContent = "Confirm and resume";
            if (!byId("confirm-campaign").open) byId("confirm-campaign").showModal();
        }
        const savedCampaignId = localStorage.getItem("promptcv_campaign_id");
        if (savedCampaignId && !state.campaignRunning) {
            state.campaignRunning = true;
            await watchCampaign(savedCampaignId);
        }
    }

    function getCampaignContent() {
        return {
            subject: byId("campaign-subject").value.trim(),
            preview_text: byId("campaign-preview").value.trim(),
            body: byId("campaign-body").value.trim()
        };
    }

    function showPreview() {
        const content = getCampaignContent();
        if (!content.subject || !content.body) {
            show(byId("campaign-message"), "Add a subject and message before previewing.", "error");
            return;
        }
        byId("preview-subject").textContent = content.subject;
        byId("preview-snippet").textContent = content.preview_text;
        byId("preview-body").textContent = content.body;
        byId("email-preview").hidden = false;
        byId("email-preview").scrollIntoView({ behavior: "smooth", block: "start" });
        show(byId("campaign-message"), "");
    }

    async function sendTest(targetMessage) {
        const isSettingsTest = targetMessage.id === "settings-message";
        const draft = getCampaignContent();
        const content = isSettingsTest && (!draft.subject || !draft.body)
            ? {
                subject: "PromptCV email delivery test",
                preview_text: "This is a test message for your PromptCV administrator account.",
                body: "This is a test email to confirm that PromptCV email delivery is configured."
            }
            : draft;
        if (!content.subject || !content.body) {
            show(targetMessage, "Add a subject and message before sending a test.", "error");
            return;
        }
        const button = targetMessage.id === "settings-message" ? byId("settings-test-email") : byId("send-test");
        button.disabled = true;
        try {
            await api("send-test", "POST", content);
            show(targetMessage, `Test email sent to ${state.session.email}.`, "success");
        } catch (error) {
            show(targetMessage, error.message, "error");
        } finally {
            button.disabled = false;
        }
    }

    async function createCampaign() {
        const button = byId("confirm-send");
        button.disabled = true;
        show(byId("campaign-message"), "Creating the campaign and taking an eligible-audience snapshot…");
        try {
            if (!state.submission) {
                const content = getCampaignContent();
                state.campaignKey ||= crypto.randomUUID();
                const submission = {
                    ...content,
                    idempotency_key: state.campaignKey,
                    expected_audience_count: state.eligible
                };
                localStorage.setItem("promptcv_campaign_submission", JSON.stringify(submission));
                state.submission = submission;
            }
            const created = await api("create-campaign", "POST", {
                ...state.submission
            });
            if (created.campaign_status === "audience_changed") {
                state.eligible = created.audience_count;
                byId("eligible-count").textContent = state.eligible.toLocaleString();
                if (state.eligible === 0) {
                    byId("confirm-campaign").close();
                    localStorage.removeItem("promptcv_campaign_submission");
                    state.submission = null;
                    state.campaignKey = null;
                    byId("campaign-subject").disabled = false;
                    byId("campaign-preview").disabled = false;
                    byId("campaign-body").disabled = false;
                    byId("send-campaign").disabled = true;
                    show(byId("campaign-message"), "No eligible subscribers remain. No launch email was sent.", "error");
                    return;
                }
                const refreshedSubmission = {
                    ...state.submission,
                    expected_audience_count: state.eligible
                };
                localStorage.setItem("promptcv_campaign_submission", JSON.stringify(refreshedSubmission));
                state.submission = refreshedSubmission;
                byId("confirm-title").textContent = "Audience changed — confirm again";
                byId("confirm-count").textContent = state.eligible.toLocaleString();
                byId("confirm-send").textContent = "Confirm updated count and send";
                show(byId("campaign-message"), "The eligible count changed before the campaign snapshot. No email was sent. Review the updated count and confirm again.");
                return;
            }
            await startCampaign(created.campaign_id);
        } catch (error) {
            show(byId("campaign-message"), error.message, "error");
        } finally {
            button.disabled = false;
        }
    }

    async function startCampaign(campaignId) {
        localStorage.setItem("promptcv_campaign_id", campaignId);
        localStorage.removeItem("promptcv_campaign_submission");
        state.campaignKey = null;
        state.submission = null;
        byId("campaign-subject").disabled = false;
        byId("campaign-preview").disabled = false;
        byId("campaign-body").disabled = false;
        byId("confirm-campaign").close();
        byId("confirm-title").textContent = "Send launch email?";
        byId("confirm-send").textContent = "Confirm and send";
        state.campaignRunning = true;
        byId("send-campaign").disabled = true;
        await watchCampaign(campaignId);
    }

    async function watchCampaign(campaignId) {
        const progress = byId("campaign-progress");
        progress.hidden = false;
        try {
            let complete = false;
            while (!complete) {
                const batch = await api("process-campaign", "POST", { campaign_id: campaignId });
                const current = await fetch(`/api/admin?action=campaign&id=${encodeURIComponent(campaignId)}`, { credentials: "same-origin" });
                const campaign = await current.json();
                if (!current.ok) throw new Error(campaign.error || "Campaign status could not be loaded");
                renderCampaignProgress(campaign);
                complete = Boolean(batch.complete || campaign.status === "complete" || campaign.status === "complete_with_errors");
                if (!complete) {
                    await new Promise((resolve) => window.setTimeout(resolve, batch.processed === 0 ? 3000 : 1200));
                }
            }
            localStorage.removeItem("promptcv_campaign_id");
            show(byId("campaign-message"), "Campaign processing is complete. Provider acceptance is not confirmation of delivery.", "success");
            try {
                await loadOverview();
            } catch (error) {
                setGlobalMessage(`Campaign completed, but the overview could not refresh: ${error.message}`, "error");
            }
        } catch (error) {
            show(progress, `${error.message} The queued campaign can resume when you return to this dashboard.`, "error");
            show(byId("campaign-message"), error.message, "error");
        } finally {
            state.campaignRunning = false;
            byId("send-campaign").disabled = !state.eligible || Boolean(localStorage.getItem("promptcv_campaign_id"));
        }
    }

    function renderCampaignProgress(campaign) {
        const progress = byId("campaign-progress");
        progress.hidden = false;
        progress.replaceChildren();
        const counts = campaign.counts || {};
        const totalDone = Number(counts.accepted || 0) + Number(counts.failed || 0) + Number(counts.skipped || 0);
        progress.append(
            make("strong", "", `Campaign ${campaign.status}`),
            make("div", "", `${totalDone} of ${campaign.audience_count} processed`),
            make("div", "", `${counts.queued || 0} queued · ${counts.processing || 0} processing · ${counts.accepted || 0} accepted by provider · ${counts.failed || 0} failed · ${counts.skipped || 0} skipped`)
        );
        if (Array.isArray(campaign.failures) && campaign.failures.length) {
            const details = make("details");
            details.append(make("summary", "", `Inspect ${campaign.failures.length} failed recipient${campaign.failures.length === 1 ? "" : "s"}`));
            campaign.failures.forEach((failure) => {
                details.append(make("p", "field-hint", `${failure.email_snapshot} · ${failure.last_error || "No provider detail"} · ${failure.attempt_count} attempt(s)`));
            });
            progress.append(details);
        }
    }

    async function loadActivity() {
        const params = new URLSearchParams({
            action: "activity",
            page: String(state.activityPage)
        });
        const status = byId("activity-status").value;
        if (status) params.set("status", status);
        const response = await fetch(`/api/admin?${params}`, { credentials: "same-origin" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Email activity could not be loaded");
        state.activityTotal = data.total;
        byId("activity-count").textContent = `${data.total} notification${data.total === 1 ? "" : "s"}`;
        byId("activity-page-label").textContent = data.total
            ? `Page ${data.page} of ${Math.ceil(data.total / data.page_size)}`
            : "No results";
        byId("activity-previous").disabled = data.page <= 1;
        byId("activity-next").disabled = data.page * data.page_size >= data.total;
        const target = byId("activity-rows");
        target.replaceChildren();
        if (!data.rows.length) {
            const row = make("tr");
            const empty = cell("No notification activity in this view.");
            empty.colSpan = 7;
            empty.className = "empty-state";
            row.append(empty);
            target.append(row);
            return;
        }
        data.rows.forEach((item) => {
            const row = make("tr");
            const recipient = Array.isArray(item.subscriber) ? item.subscriber[0] : item.subscriber;
            row.append(cell(item.notification_type.replace(/_/g, " ")), cell(recipient?.email || "Subscriber"));
            const status = cell();
            status.append(statusPill(item.status));
            row.append(status, cell(item.attempt_count),
                cell(item.sent_at ? `${formatDate(item.created_at)} / ${formatDate(item.sent_at)}` : formatDate(item.created_at)),
                cell(item.provider_message_id || "—"),
                cell(item.status === "failed" ? item.last_error || "No detail provided" : "—"));
            target.append(row);
        });
    }

    async function loadSettings() {
        const data = await api("session");
        const target = byId("configuration-list");
        target.replaceChildren();
        const items = [
            ["Waitlist database", data.configuration.database],
            ["Email delivery (Resend)", data.configuration.emailDelivery],
            ["Website analytics", data.configuration.analytics]
        ];
        items.forEach(([label, configured]) => {
            const row = make("li");
            row.append(make("span", "", label), make("span", "config-state", configured ? "Configured" : "Not configured"));
            target.append(row);
        });
    }

    async function signOut() {
        try {
            await api("logout", "POST", {});
            showLogin("You have signed out.");
        } catch (error) {
            setGlobalMessage(`Could not sign out: ${error.message}`, "error");
        }
    }

    byId("login-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector("button[type=submit]");
        button.disabled = true;
        show(byId("login-message"), "Signing in…");
        try {
            const email = byId("login-email").value.trim();
            const password = byId("login-password").value;
            const result = await api("login", "POST", { email, password });
            form.reset();
            showDashboard(result);
            switchView("overview");
        } catch (error) {
            show(byId("login-message"), error.message, "error");
        } finally {
            button.disabled = false;
        }
    });

    document.querySelectorAll(".nav-item").forEach((button) => {
        button.addEventListener("click", () => switchView(button.dataset.view));
    });
    document.querySelectorAll("[data-go]").forEach((button) => {
        button.addEventListener("click", () => switchView(button.dataset.go));
    });
    document.querySelectorAll("[data-refresh]").forEach((button) => {
        button.addEventListener("click", () => loadView(button.dataset.refresh).catch((error) => setGlobalMessage(error.message, "error")));
    });
    byId("sign-out").addEventListener("click", signOut);
    byId("settings-sign-out").addEventListener("click", signOut);
    byId("theme-toggle").addEventListener("click", () => {
        const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(theme, true);
    });
    byId("subscriber-search").addEventListener("input", () => {
        window.clearTimeout(state.searchTimer);
        state.searchTimer = window.setTimeout(() => {
            state.subscriberPage = 1;
            loadSubscribers().catch((error) => setGlobalMessage(error.message, "error"));
        }, 250);
    });
    byId("subscriber-status").addEventListener("change", () => {
        state.subscriberPage = 1;
        loadSubscribers().catch((error) => setGlobalMessage(error.message, "error"));
    });
    byId("subscriber-sort").addEventListener("change", () => {
        state.subscriberPage = 1;
        loadSubscribers().catch((error) => setGlobalMessage(error.message, "error"));
    });
    byId("subscribers-previous").addEventListener("click", () => {
        state.subscriberPage = Math.max(1, state.subscriberPage - 1);
        loadSubscribers().catch((error) => setGlobalMessage(error.message, "error"));
    });
    byId("subscribers-next").addEventListener("click", () => {
        state.subscriberPage += 1;
        loadSubscribers().catch((error) => setGlobalMessage(error.message, "error"));
    });
    byId("export-csv").addEventListener("click", exportEligibleSubscribers);
    byId("preview-email").addEventListener("click", showPreview);
    byId("close-preview").addEventListener("click", () => { byId("email-preview").hidden = true; });
    byId("send-test").addEventListener("click", () => sendTest(byId("campaign-message")));
    byId("settings-test-email").addEventListener("click", () => sendTest(byId("settings-message")));
    byId("activity-status").addEventListener("change", () => {
        state.activityPage = 1;
        loadActivity().catch((error) => setGlobalMessage(error.message, "error"));
    });
    byId("activity-previous").addEventListener("click", () => {
        state.activityPage = Math.max(1, state.activityPage - 1);
        loadActivity().catch((error) => setGlobalMessage(error.message, "error"));
    });
    byId("activity-next").addEventListener("click", () => {
        state.activityPage += 1;
        loadActivity().catch((error) => setGlobalMessage(error.message, "error"));
    });
    byId("send-campaign").addEventListener("click", () => {
        const refreshAudience = async () => {
            const button = byId("send-campaign");
            button.disabled = true;
            try {
                const audience = await api("audience");
                state.eligible = audience.eligible;
                byId("eligible-count").textContent = audience.eligible.toLocaleString();
                if (audience.eligible < 1) {
                    show(byId("campaign-message"), "There are no eligible subscribers to receive this campaign.", "error");
                    return;
                }
                const content = state.submission || getCampaignContent();
                if (!content.subject || !content.body) {
                    show(byId("campaign-message"), "Add a subject and message before sending.", "error");
                    return;
                }
                byId("confirm-title").textContent = state.submission
                    ? "Resume launch email confirmation"
                    : "Send launch email?";
                byId("confirm-send").textContent = state.submission ? "Confirm and resume" : "Confirm and send";
                byId("confirm-subject").textContent = content.subject;
                byId("confirm-count").textContent = audience.eligible.toLocaleString();
                byId("confirm-campaign").showModal();
            } catch (error) {
                show(byId("campaign-message"), error.message, "error");
            } finally {
                button.disabled = Boolean(state.campaignRunning || localStorage.getItem("promptcv_campaign_id"));
                if (state.submission) button.disabled = true;
            }
        };
        void refreshAudience();
    });
    byId("confirm-send").addEventListener("click", (event) => {
        event.preventDefault();
        void createCampaign();
    });

    api("session").then((session) => {
        showDashboard(session);
        switchView("overview");
    }).catch((error) => {
        if (!/sign in/i.test(error.message)) show(byId("login-message"), error.message, "error");
        showLogin();
    });
})();
