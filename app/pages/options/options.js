//  remove status
function remove_children(node){
    while (node.firstChild){
        node.removeChild(node.firstChild);
    }
}

//  save
function save_options() {
    console.log("save options");
    remove_children(document.getElementById('success'));
    remove_children(document.getElementById('error'));

    var download_to = document.getElementById('download_to').value;
    var open_save_as = document.getElementById('open_save_as').checked;
    download_to = download_to.trim().replace('\\', '/').replace(/[#:,*?"<>|]/g, '_');
    if(download_to.length > 0){
        var split = download_to.split('/');
        var newDirString = '';
        var i, len;
        for (i = 0, len = split.length; i < len; ++i) {
            var trimmed = split[i].trim();
            if(trimmed.length <= 0){
                console.log('failed to save.');
                var status = document.getElementById('error');
                var line;
                line = status.appendChild(document.createElement('span'));
                status.appendChild(document.createElement('br'));
                line.textContent = 'Invalid filename.';
                line = status.appendChild(document.createElement('span'));
                status.appendChild(document.createElement('br'));
                line.textContent = 'correct example : "aaa", "aaa/bbb"';
                line = status.appendChild(document.createElement('span'));
                status.appendChild(document.createElement('br'));
                line.textContent = 'bad example : "/aaa", "aaa//bbb", aaa/';
                return;
            }
            if(newDirString.length > 0) newDirString += '/';
            newDirString += trimmed;
        }
        download_to = newDirString;
    }
    chrome.storage.local.set({
        download_to: download_to,
        open_save_as: open_save_as
    }, function() {
        console.log('options are saved.');
        var successStatus = document.getElementById('success');
        var line = successStatus.appendChild(document.createElement('span'));
        line.textContent = 'Options are saved successfully.';
        window.close();
    });
}

//  restore to page
function restore_options() {
    console.log("restore options");
    chrome.storage.local.get({
        download_to : 'TwitterImageDLer',
        open_save_as : false
    }, function(items) {
        document.getElementById('download_to').value = items.download_to;
        document.getElementById('open_save_as').checked = items.open_save_as;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
