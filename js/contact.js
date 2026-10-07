(() => {
    const form = document.querySelector("#contact-form");
    const topicPreview = document.querySelector("#contact-topic-preview");
    const status = document.querySelector("#contact-form-status");

    if (!form || !topicPreview || !status) return;

    const recipient = "nictech005@gmail.com";
    const topicInputs = [...form.querySelectorAll('input[name="topic"]')];

    const getSelectedTopic = () => topicInputs.find((input) => input.checked)?.value;

    topicInputs.forEach((input) => {
        input.addEventListener("change", () => {
            topicPreview.textContent = `Email subject: PromptCV Website | ${input.value}`;
            status.textContent = "";
        });
    });

    form.addEventListener("input", () => {
        status.textContent = "";
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        status.textContent = "";

        if (!form.reportValidity()) return;

        const topic = getSelectedTopic();
        if (!topic) {
            topicInputs[0].focus();
            status.textContent = "Please choose a topic so we can add it to your email subject.";
            return;
        }

        const formData = new FormData(form);
        const name = String(formData.get("name")).trim();
        const email = String(formData.get("email")).trim();
        const message = String(formData.get("message")).trim();
        const subject = `PromptCV Website | ${topic}`;
        const body = [
            "A message from the PromptCV website contact form.",
            "",
            `Name: ${name}`,
            `Email: ${email}`,
            `Topic: ${topic}`,
            "",
            "Message:",
            message
        ].join("\n");
        const params = new URLSearchParams({ subject, body });
        window.location.href = `mailto:${recipient}?${params.toString()}`;
        status.textContent = "Your email app should open with the PromptCV website and selected topic in the subject. Review your message there, then press Send.";
    });
})();
