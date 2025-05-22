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
        includeHTML(); // recursively include nested includes
      })
      .catch(error => {
        el.innerHTML = "Error loading file.";
        console.error(error);
      });
  });
}

// Call it on page load
document.addEventListener("DOMContentLoaded", includeHTML);