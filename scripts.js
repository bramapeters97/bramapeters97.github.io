
function includeHTML() {
    const elements = document.querySelectorAll('[include-html]');
    elements.forEach(el => {
        const file = el.getAttribute("include-html");
        fetch(file)
            .then(response => {
                if (!response.ok) throw new Error("Page not found");
                return response.text();
            })
            .then(data => {
                el.innerHTML = data;
                el.removeAttribute("include-html");
                includeHTML(); // handle nested includes
            })
            .catch(error => {
                el.innerHTML = "Error loading file.";
                console.error(error);
            });
    });
}
document.addEventListener("DOMContentLoaded", includeHTML);
