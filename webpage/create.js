async function create() {
    let str = location.origin + "/tryCreate";
    str += "?username=" + encodeURIComponent(document.getElementById("username").value);
    str += "&email=" + encodeURIComponent(document.getElementById("email").value);
    str += "&pass_hash=" + sha256(document.getElementById("password").value);
    str += "&c_pass_hash=" + sha256(document.getElementById("c_password").value);
    str += "&pass_len=" + document.getElementById("password").value.length.toString();
    location.href = str;
}
window.addEventListener("load", () => {
    keypress = (e) => {
        if (e.key == "Enter") {
            e.preventDefault(); login();
        }
    };
    document.getElementById("username").addEventListener("keypress", keypress);
    document.getElementById("email").addEventListener("keypress", keypress);
    document.getElementById("password").addEventListener("keypress", keypress);
    document.getElementById("c_password").addEventListener("keypress", keypress);
});
document.addEventListener("DOMContentLoaded", () => {
    // toggle password visibility
    document.getElementById("toggle1").addEventListener("change", async () => document.getElementById("password").type = ((document.getElementById("toggle1").checked) ? "text" : "password"));
    document.getElementById("toggle2").addEventListener("change", async () => document.getElementById("c_password").type = ((document.getElementById("toggle2").checked) ? "text" : "password"));
});