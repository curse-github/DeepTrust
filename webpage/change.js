async function change() {
    let str = location.origin + "/tryChange";
    str += "?email=" + encodeURIComponent(document.getElementById("email").value);
    str += "&o_pass_hash=" + sha256(document.getElementById("o_password").value);
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
    document.getElementById("email").addEventListener("keypress", keypress);
    document.getElementById("o_password").addEventListener("keypress", keypress);
    document.getElementById("password").addEventListener("keypress", keypress);
    document.getElementById("c_password").addEventListener("keypress", keypress);
});
document.addEventListener("DOMContentLoaded", () => {
    // toggle password visibility
    document.getElementById("toggle1").addEventListener("change", async () => document.getElementById("o_password").type = ((document.getElementById("toggle1").checked) ? "text" : "password"));
    document.getElementById("toggle2").addEventListener("change", async () => document.getElementById("password").type = ((document.getElementById("toggle2").checked) ? "text" : "password"));
    document.getElementById("toggle3").addEventListener("change", async () => document.getElementById("c_password").type = ((document.getElementById("toggle3").checked) ? "text" : "password"));
});