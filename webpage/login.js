async function login() {
    let str = location.origin + "/tryLogin";
    str += "?email=" + encodeURIComponent(document.getElementById("email").value);
    str += "&pass_hash=" + sha256(document.getElementById("password").value).toString();
    location.href = str;
}
window.addEventListener("load", () => {
    keypress = (e) => {
        if (e.key == "Enter") {
            e.preventDefault(); login();
        }
    };
    document.getElementById("email").addEventListener("keypress", keypress);
    document.getElementById("password").addEventListener("keypress", keypress);
});