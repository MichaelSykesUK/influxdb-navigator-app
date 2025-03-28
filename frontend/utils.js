/*------------------------------------------------------------------------------
   Inline Rename and Drag Functions
------------------------------------------------------------------------------*/
function enableInlineRename(box) {
  const titleDiv = box.querySelector(".box-title");
  const currentName = titleDiv.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentName;
  input.style.fontSize = "12px";
  titleDiv.replaceWith(input);
  input.focus();
  input.select();
  input.addEventListener("blur", () => finishRename(box, input.value));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
}

function finishRename(box, newName) {
  const newTitle = document.createElement("div");
  newTitle.className = "box-title";
  newTitle.textContent = newName;
  box.querySelector("input").replaceWith(newTitle);
  if (box === selectedBox) {
    document.getElementById("navigatorHeader").textContent = "Navigator: " + newName;
  }
}

function makeDraggable(el) {
  let isDragging = false, offsetX = 0, offsetY = 0;
  el.addEventListener("mousedown", function(e) {
    if (e.target.classList.contains("plot-btn") ||
        e.target.classList.contains("minus-btn") ||
        e.target.classList.contains("join-btn") ||
        e.target.tagName === "INPUT") return;
    isDragging = true;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    function onMouseMove(e) {
      if (!isDragging) return;
      el.style.left = (e.clientX - offsetX) + "px";
      el.style.top = (e.clientY - offsetY) + "px";
      updateConnectors();
    }
    function onMouseUp() {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

/*------------------------------------------------------------------------------
   Box Connector Functions
------------------------------------------------------------------------------*/
function connectBoxes(box1, box2, color = "#007acc") {
  const svg = document.getElementById("canvasSVG");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", "1.5");
  svg.appendChild(line);
  connectors.push({ line, box1, box2 });
  updateConnectors();
}

function updateConnectors() {
  connectors.forEach(conn => {
    const rect1 = conn.box1.getBoundingClientRect();
    const rect2 = conn.box2.getBoundingClientRect();
    if (rect2.left >= rect1.left + rect1.width / 2) {
      conn.line.setAttribute("x1", rect1.right - 1);
      conn.line.setAttribute("y1", rect1.top + rect1.height / 2);
      conn.line.setAttribute("x2", rect2.left + 1);
      conn.line.setAttribute("y2", rect2.top + rect2.height / 2);
    } else {
      conn.line.setAttribute("x1", rect1.left + 1);
      conn.line.setAttribute("y1", rect1.top + rect1.height / 2);
      conn.line.setAttribute("x2", rect2.right - 1);
      conn.line.setAttribute("y2", rect2.top + rect2.height / 2);
    }
  });
}

/*------------------------------------------------------------------------------
   Resizing Functions
------------------------------------------------------------------------------*/
function startResizeHorizontal(e) {
  e.preventDefault();
  let startY = e.clientY;
  const whiteboard = document.getElementById("whiteboard");
  const terminal = document.getElementById("terminal");
  const minWhiteboardHeight = 100;
  const minTerminalHeight = 100;
  function doDrag(e) {
    const dy = e.clientY - startY;
    let newWhiteboardHeight = whiteboard.offsetHeight + dy;
    let newTerminalHeight = terminal.offsetHeight - dy;
    if (newWhiteboardHeight < minWhiteboardHeight) {
      newWhiteboardHeight = minWhiteboardHeight;
      newTerminalHeight = whiteboard.offsetHeight + terminal.offsetHeight - minWhiteboardHeight;
    }
    if (newTerminalHeight < minTerminalHeight) {
      newTerminalHeight = minTerminalHeight;
      newWhiteboardHeight = whiteboard.offsetHeight + terminal.offsetHeight - minTerminalHeight;
    }
    whiteboard.style.height = newWhiteboardHeight + "px";
    terminal.style.height = newTerminalHeight + "px";
    startY = e.clientY;
  }
  function stopDrag() {
    document.removeEventListener("mousemove", doDrag);
    document.removeEventListener("mouseup", stopDrag);
  }
  document.addEventListener("mousemove", doDrag);
  document.addEventListener("mouseup", stopDrag);
}

function startResizeVertical(e) {
  e.preventDefault();
  let startX = e.clientX;
  const terminal = document.getElementById("terminal");
  const leftTerminal = document.getElementById("leftTerminal");
  const rightTerminal = document.getElementById("rightTerminal");
  const totalWidth = terminal.offsetWidth;
  function doDrag(e) {
    const dx = e.clientX - startX;
    leftTerminal.style.width = (leftTerminal.offsetWidth + dx) + "px";
    rightTerminal.style.width = (totalWidth - leftTerminal.offsetWidth - 5) + "px";
    document.getElementById("verticalDivider").style.left = leftTerminal.offsetWidth + "px";
    startX = e.clientX;
  }
  function stopDrag() {
    document.removeEventListener("mousemove", doDrag);
    document.removeEventListener("mouseup", stopDrag);
  }
  document.addEventListener("mousemove", doDrag);
  document.addEventListener("mouseup", stopDrag);
}

/*------------------------------------------------------------------------------
   Button and Export Functions
------------------------------------------------------------------------------*/
function setRunButtonLoading(isLoading) {
  const runButton = document.getElementById("runButton");
  runButton.disabled = isLoading;
  runButton.innerHTML = isLoading
    ? '<div class="spinner"></div>'
    : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#007acc" viewBox="0 0 24 24">
         <path d="M8 5v14l11-7z"/>
       </svg>`;
}

function exportCSV() {
  if (!selectedBox) { alert("No box selected."); return; }
  const state = boxState[selectedBox.id];
  if (!state.data || state.data.length === 0) { alert("No data to export."); return; }
  const columns = state.data._columns || Object.keys(state.data[0]);
  let csv = [columns.map(key => `"${key.replace(/"/g, '""')}"`).join(",")];
  state.data.forEach(row => {
    csv.push(columns.map(key => `"${String(row[key]).replace(/"/g, '""')}"`).join(","));
  });
  const blob = new Blob([csv.join("\n")], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "table_results.csv";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderChart(config) {
  const container = document.getElementById("tableContainer");
  container.innerHTML = '<canvas id="chartCanvas"></canvas>';
  const ctx = document.getElementById("chartCanvas").getContext("2d");
  if (currentChart) { currentChart.destroy(); }
  currentChart = new Chart(ctx, config);
}

function toggleMaximize() {
  const rt = document.getElementById("rightTerminal");
  const mtBtn = document.getElementById("maximizeBtn");
  const whiteboard = document.getElementById("whiteboard");
  if (!rt.classList.contains("maximized")) {
    rt.dataset.originalWidth = rt.style.width || window.getComputedStyle(rt).width;
    rt.classList.add("maximized");
    rt.style.position = "fixed";
    rt.style.top = "0";
    rt.style.left = "0";
    rt.style.width = "100%";
    rt.style.height = "100%";
    rt.style.zIndex = "10000";
    mtBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#007acc" viewBox="0 0 24 24">
                           <path d="M3 3h24v24H3V3z" fill="none"/>
                           <path d="M19 13H5v-2h14v2z"/>
                         </svg>`;
    mtBtn.title = "Minimize";
    whiteboard.style.display = "none";
  } else {
    rt.classList.remove("maximized");
    rt.style.position = "";
    rt.style.top = "";
    rt.style.left = "";
    rt.style.width = rt.dataset.originalWidth || "50%";
    rt.style.height = "";
    rt.style.zIndex = "";
    mtBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#007acc" viewBox="0 0 24 24">
                           <path d="M3 3h18v18H3V3zm2 2v14h14V5H5z"/>
                         </svg>`;
    mtBtn.title = "Maximize";
    delete rt.dataset.originalWidth;
    whiteboard.style.display = "block";
  }
}

/*------------------------------------------------------------------------------
   Data and Dropdown Helpers
------------------------------------------------------------------------------*/
function addDropdownSearch(menu, searchInputClass, optionClass) {
  menu.innerHTML = "";
  let effectiveOptionSelector = optionClass;
  if (effectiveOptionSelector[0] !== ".") {
    effectiveOptionSelector = "." + effectiveOptionSelector;
  }
  if (!menu.querySelector(`.${searchInputClass}`)) {
    let searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = searchInputClass;
    searchInput.placeholder = "Search...";
    searchInput.addEventListener("click", e => e.stopPropagation());
    searchInput.addEventListener("keyup", function () {
      let filter = searchInput.value.toLowerCase();
      menu.querySelectorAll(effectiveOptionSelector).forEach(opt => {
        const text = opt.textContent.toLowerCase();
        opt.style.display = text.includes(filter) ? "block" : "none";
      });
    });
    menu.insertBefore(searchInput, menu.firstChild);
    searchInput.addEventListener("focus", function () {
      menu.style.display = "block";
    });
    searchInput.addEventListener("blur", function () {
      setTimeout(function () {
        menu.style.display = "none";
      }, 100);
    });
  }
}

function populateDropdown(menu, options, optionClass, button, callback) {
  options.forEach(option => {
    let opt = document.createElement("div");
    opt.className = optionClass;
    opt.textContent = option;
    opt.dataset.value = option;
    opt.addEventListener("click", function () {
      let btn = document.getElementById(button);
      btn.dataset.selected = option;
      btn.querySelector("span").textContent = option;
      if (callback) callback(option);
    });
    menu.appendChild(opt);
  });
}

function populateDropdownMulti(menu, options, optionClass, button, callback) {
  options.forEach(option => {
    let opt = document.createElement("div");
    opt.className = optionClass;
    opt.textContent = option;
    opt.dataset.value = option;
    opt.addEventListener("click", function () {
      let btn = document.getElementById(button);
      let current = btn.dataset.selected ? btn.dataset.selected.split(",") : [];
      if (current.includes(option)) {
        current = current.filter(v => v !== option);
      } else {
        current.push(option);
      }
      btn.dataset.selected = current.join(",");
      btn.querySelector("span").textContent = current.length ? current.join(", ") : "Select columns";
      if (callback) callback(current);
    });
    menu.appendChild(opt);
  });
}

function addClearOption(menu, optionClass, button) {
  let clearOpt = document.createElement("div");
  clearOpt.className = optionClass;
  clearOpt.textContent = "Clear";
  clearOpt.dataset.value = "";
  clearOpt.addEventListener("click", function() {
    let btn = document.getElementById(button);
    btn.dataset.selected = "";
    btn.querySelector("span").textContent = "Select columns";
    menu.style.display = "none";
  });
  menu.appendChild(clearOpt);
}

/*------------------------------------------------------------------------------
   Box Creation and Deletion
------------------------------------------------------------------------------*/
function createJoinBox(title, leftSQLBox, rightSQLBox) {
  const joinState = {
    leftParent: leftSQLBox.id,
    rightParent: rightSQLBox.id,
    joinType: "Left Join",
    leftJoinColumn: "",
    rightJoinColumn: "",
    title: title
  };
  return createBox(title, "join", null, joinState);
}

function deleteBox(box) {
  let nextSelectedId = null;
  if (selectedBox === box && boxState[box.id] && boxState[box.id].parent) {
    nextSelectedId = boxState[box.id].parent;
  }
  let toDelete = [box];
  let found = true;
  while (found) {
    found = false;
    connectors.forEach(conn => {
      if (toDelete.includes(conn.box1) && !toDelete.includes(conn.box2)) {
        toDelete.push(conn.box2);
        found = true;
      }
    });
  }
  connectors = connectors.filter(conn => {
    if (toDelete.includes(conn.box1) || toDelete.includes(conn.box2)) {
      conn.line.remove();
      return false;
    }
    return true;
  });
  toDelete.forEach(b => {
    let idx = boxes.indexOf(b);
    if (idx > -1) boxes.splice(idx, 1);
    if (boxState[b.id]) delete boxState[b.id];
    if (transWhereState[b.id]) delete transWhereState[b.id];
    if (plotYState[b.id]) delete plotYState[b.id];
    b.remove();
  });
  updateConnectors();
  if (toDelete.includes(selectedBox)) {
    let parentEl = nextSelectedId ? document.getElementById(nextSelectedId) : (boxes.length > 0 ? boxes[0] : null);
    if (parentEl) {
      selectBox(parentEl);
    } else {
      selectedBox = null;
      document.getElementById("navigatorHeader").textContent = "Navigator:";
      document.getElementById("tableHeader").textContent = "Results:";
      document.getElementById("tableContainer").innerHTML = "";
    }
  }
}

function runQueryForBox(box) {
  selectBox(box);
  runQuery();
}

function displayTable(dataArray) {
  const container = document.getElementById("tableContainer");
  if (!dataArray || dataArray.length === 0) {
    container.innerHTML = "";
    updateTableHeader(dataArray, "");
    return;
  }
  let columns = dataArray._columns || Object.keys(dataArray[0]);
  let totalCells = dataArray.length * columns.length;
  let maxRows = dataArray.length;
  if (totalCells > 100000) {
    if (100 * columns.length <= 100000) { maxRows = 100; }
    else if (50 * columns.length <= 100000) { maxRows = 50; }
    else if (10 * columns.length <= 100000) { maxRows = 10; }
    else { maxRows = 0; }
  }
  let displayData = dataArray.slice(0, maxRows);
  let note = (maxRows < dataArray.length) ? "Showing first " + maxRows + " rows" : "";
  let table = `<table style="font-size:12px; width:100%; border-collapse:collapse;"><thead><tr>`;
  columns.forEach(key => { table += `<th style="border:1px solid #ddd; padding:4px; white-space: nowrap;">${key}</th>`; });
  table += `</tr></thead><tbody>`;
  displayData.forEach(row => {
    table += `<tr>`;
    columns.forEach(key => { table += `<td style="border:1px solid #ddd; padding:4px; white-space: nowrap;">${row[key]}</td>`; });
    table += `</tr>`;
  });
  table += `</tbody></table>`;
  if (note) {
    table += `<div style="font-style: italic; padding-top:5px;">${note}</div>`;
  }
  container.innerHTML = table;
  updateTableHeader(dataArray, note);
}

function updateTableHeader(dataArray, note = "") {
  const header = document.getElementById("tableHeader");
  const currentBox = document.querySelector(".box.selected");
  if (!currentBox) {
    header.textContent = "Results: No selection";
    return;
  }
  const boxTitle = currentBox.querySelector(".box-title").textContent;
  header.textContent = dataArray && dataArray.length > 0 ?
    `Results: ${boxTitle} (${dataArray.length} Rows x ${Object.keys(dataArray[0]).length} Columns) ${note}` :
    `Results: ${boxTitle}`;
  boxState[currentBox.id].header = header.textContent;
}

function saveConfig() {
  const config = {
    boxes: boxes.map(box => {
      const state = boxState[box.id] || {};
      let runArgs = {};
      if (box.dataset.type === "influx") {
        runArgs = { code: state.code || "Run to show available tables" };
      } else if (box.dataset.type === "table") {
        runArgs = {
          table: state.table || "",
          start_time: state.start_time || "",
          end_time: state.end_time || "",
          parent: state.parent || null
        };
      } else if (box.dataset.type === "sql") {
        runArgs = {
          basicSQL: state.basicSQL || "",
          advancedSQL: state.advancedSQL || "",
          parent: state.parent || null,
          sqlMode: state.sqlMode || "basic",
          selectClause: state.selectClause || "",
          whereClause: state.whereClause || "",
          whereOperator: state.whereOperator || "=",
          whereValue: state.whereValue || "",
          additionalWhere: state.additionalWhere || []
        };
      } else if (box.dataset.type === "plot") {
        runArgs = {
          xField: state.xField || "",
          yField: state.yField || "",
          additionalYFields: state.additionalYFields || [],
          parent: state.parent || null
        };
      } else if (box.dataset.type === "join") {
        runArgs = {
          joinType: state.joinType || "",
          leftJoinColumn: state.leftJoinColumn || "",
          rightJoinColumn: state.rightJoinColumn || "",
          leftParent: state.leftParent || null,
          rightParent: state.rightParent || null
        };
      }
      return {
        id: box.id,
        type: box.dataset.type,
        title: box.querySelector(".box-title").innerText,
        runArgs: runArgs,
        left: box.style.left,
        top: box.style.top
      };
    }),
    counters: { tableQueryCounter, sqlTransformCounter, plotCounter, joinCounter, boxIdCounter }
  };
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "config.json";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function loadConfig(event) {
  const file = event.target.files[0];
  if (!file) return;
  showLoadingOverlay();
  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const config = JSON.parse(e.target.result);
      console.log("Loaded config:", config);
      boxes.forEach(box => box.remove());
      boxes = [];
      connectors.forEach(conn => conn.line.remove());
      connectors = [];
      boxState = {};
      tableQueryCounter = config.counters.tableQueryCounter;
      sqlTransformCounter = config.counters.sqlTransformCounter;
      plotCounter = config.counters.plotCounter;
      joinCounter = config.counters.joinCounter;
      boxIdCounter = config.counters.boxIdCounter;
      let builtBoxes = new Set();
      function dependenciesMet(boxConf) {
        if (boxConf.type === "influx") {
          return true;
        } else if (boxConf.type === "join") {
          const { leftParent, rightParent } = boxConf.runArgs;
          return (builtBoxes.has(leftParent) && builtBoxes.has(rightParent) && !boxState[leftParent].task_running && !boxState[rightParent].task_running);
        } else {
          const parent = boxConf.runArgs.parent;
          return builtBoxes.has(parent) && !boxState[parent].task_running;
        }
      }
      let remainingBoxes = [...config.boxes];
      while (remainingBoxes.length > 0) {
        let builtThisRound = false;
        for (let i = 0; i < remainingBoxes.length; i++) {
          const boxConf = remainingBoxes[i];
          if (dependenciesMet(boxConf)) {
            let parentId = boxConf.runArgs.parent || null;
            let configState = Object.assign({}, boxConf.runArgs, {
              left: boxConf.left,
              top: boxConf.top,
              title: boxConf.title,
              id: boxConf.id
            });
            console.log("Config state for", boxConf.id, configState);
            let newBox = createBox(boxConf.title, boxConf.type, parentId, configState);
            if (boxConf.type === "join") {
              boxState[newBox.id].leftParent = boxConf.runArgs.leftParent;
              boxState[newBox.id].rightParent = boxConf.runArgs.rightParent;
              let leftParentBox = document.getElementById(boxConf.runArgs.leftParent);
              let rightParentBox = document.getElementById(boxConf.runArgs.rightParent);
              if (leftParentBox && rightParentBox) {
                connectBoxes(leftParentBox, newBox, "#008000");
                connectBoxes(rightParentBox, newBox, "#008000");
              }
            } else if (parentId) {
              let parentBox = document.getElementById(parentId);
              if (parentBox) {
                connectBoxes(parentBox, newBox);
              }
            }
            selectBox(newBox);
            runQueryForBox(newBox);
            await waitForBoxQueryCompletion(newBox);
            builtBoxes.add(newBox.id);
            builtThisRound = true;
            remainingBoxes.splice(i, 1);
            i--;
          }
        }
        if (!builtThisRound) {
          console.error("Cannot build remaining boxes; possible dependency cycle or missing parent.");
          break;
        }
      }
      updateConnectors();
      hideLoadingOverlay();
      console.log("Configuration loaded successfully.");
    } catch (err) {
      console.error("Error loading config:", err);
      hideLoadingOverlay();
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function waitForBoxQueryCompletion(box) {
  return new Promise((resolve) => {
    const check = () => {
      if (boxState[box.id] && !boxState[box.id].task_running) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

function updateSQLFromBasic() { 
  if (!selectedBox || selectedBox.dataset.type !== "sql") return;
  const state = boxState[selectedBox.id];
  let selectClause = document.getElementById("selectDisplay").textContent.trim();
  if (!selectClause || selectClause === "Select columns") {
    selectClause = "*";
  } else {
    selectClause = selectClause.split(",").map(col => `"${col.trim()}"`).join(", ");
  }
  let whereClause = document.getElementById("whereDisplay").textContent.trim();
  let opText = document.getElementById("operatorDisplay").textContent.trim();
  const opMap = { "=": "=", "<": "<", ">": ">" };
  let whereOperator = opMap[opText] || "=";
  let whereValue = document.getElementById("whereValue").value.trim();
  state.whereClause = whereClause;
  state.whereOperator = whereOperator;
  state.whereValue = whereValue;
  let whereClauseCombined = "";
  if (whereClause && whereClause !== "Select columns" && whereValue) {
    whereClauseCombined = `${whereClause} ${whereOperator} '${whereValue}'`;
  }
  let additionalWhereRows = document.querySelectorAll("#additionalWhereContainer .where-condition");
  state.additionalWhere = [];
  additionalWhereRows.forEach(row => {
    let col = row.querySelector(".where-button span").textContent.trim();
    let opTxt = row.querySelector(".operator-button span").textContent.trim();
    let opSym = opMap[opTxt] || "=";
    let val = row.querySelector(".whereValue").value.trim();
    let operatorLabelElem = row.querySelector(".where-operator-label");
    let opLabel = (operatorLabelElem && operatorLabelElem.textContent.trim()) || "AND";
    state.additionalWhere.push({ column: col, operator: opSym, value: val, logic: opLabel });
    if (col && col !== "Select columns" && val) {
      if (whereClauseCombined !== "") { whereClauseCombined += " " + opLabel + " "; }
      whereClauseCombined += `${col} ${opSym} '${val}'`;
    }
  });
  let formattedSQL = "";
  if (whereClauseCombined) {
    formattedSQL = "SELECT " + selectClause + " FROM df\nWHERE " + whereClauseCombined.replace(/ (AND|OR) /g, "\n$1 ");
  } else {
    formattedSQL = "SELECT " + selectClause + " FROM df";
  }
  state.basicSQL = formattedSQL;
  const previewEl = document.getElementById("basicSQLPreview");
  let labelEl = document.getElementById("generatedSQLLabel");
  if (!labelEl) {
    labelEl = document.createElement("label");
    labelEl.id = "generatedSQLLabel";
    labelEl.textContent = "Generated SQL Statement:";
    previewEl.parentNode.insertBefore(labelEl, previewEl);
  }
  previewEl.innerHTML = "<pre>" + formattedSQL + "</pre>";
}

function resetBasicSQL() {
  if (!selectedBox || selectedBox.dataset.type !== "sql") return;
  document.getElementById("selectDisplay").textContent = "Select columns";
  document.getElementById("selectButton").dataset.selected = "";
  document.getElementById("whereDisplay").textContent = "Select columns";
  document.getElementById("whereButton").dataset.selected = "";
  document.getElementById("operatorDisplay").textContent = "=";
  document.getElementById("whereValue").value = "";
  document.getElementById("additionalWhereContainer").innerHTML = "";
  updateSQLFromBasic();
}

function resetAdvancedSQL() {
  if (!selectedBox || selectedBox.dataset.type !== "sql") return;
  sqlEditorCM.setValue("SELECT * FROM df");
}

function updateTableHeader(dataArray, note = "") {
  const header = document.getElementById("tableHeader");
  const currentBox = document.querySelector(".box.selected");
  if (!currentBox) {
    header.textContent = "Results: No selection";
    return;
  }
  const boxTitle = currentBox.querySelector(".box-title").textContent;
  header.textContent = dataArray && dataArray.length > 0 ?
    `Results: ${boxTitle} (${dataArray.length} Rows x ${Object.keys(dataArray[0]).length} Columns) ${note}` :
    `Results: ${boxTitle}`;
  boxState[currentBox.id].header = header.textContent;
}

function showLoadingOverlay() {
  let overlay = document.getElementById("loadingOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.color = "#fff";
    overlay.style.fontSize = "24px";
    overlay.style.zIndex = "10000";
    overlay.innerHTML = "Loading configuration...";
    document.body.appendChild(overlay);
  } else {
    overlay.style.display = "flex";
  }
}

function hideLoadingOverlay() {
  let overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}
