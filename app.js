// TradePro AI Journal - State and UI Layer
document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let state = {
    trades: [],
    analyses: [],
    analyticsScreenshots: [], // Global screenshots for study
    currentLightboxIndex: 0,
    currentLightboxImages: [] // Active list of images in lightbox
  };

  // Load from LocalStorage
  function loadFromStorage() {
    try {
      const storedTrades = localStorage.getItem("tp_trades");
      const storedAnalyses = localStorage.getItem("tp_analyses");
      const storedGlobalSS = localStorage.getItem("tp_global_ss");

      if (storedTrades) state.trades = JSON.parse(storedTrades);
      if (storedAnalyses) state.analyses = JSON.parse(storedAnalyses);
      if (storedGlobalSS) state.analyticsScreenshots = JSON.parse(storedGlobalSS);
    } catch (e) {
      console.error("Failed to load local storage:", e);
      showToast("Failed to load stored data", "danger");
    }
  }

  // Save to LocalStorage
  function saveToStorage() {
    try {
      localStorage.setItem("tp_trades", JSON.stringify(state.trades));
      localStorage.setItem("tp_analyses", JSON.stringify(state.analyses));
      localStorage.setItem("tp_global_ss", JSON.stringify(state.analyticsScreenshots));
      
      const statusEl = document.getElementById("storageStatus");
      if (statusEl) {
        statusEl.textContent = "Synced";
        statusEl.style.color = "var(--success)";
      }
    } catch (e) {
      console.error("Failed to save to local storage:", e);
      showToast("Storage quota exceeded. Consider exporting older trades.", "danger");
    }
  }

  // --- IMAGE UTILS (COMPRESSION TO PREVENT QUOTA EXCEEDED) ---
  function compressImage(base64Str, maxWidth = 800, maxHeight = 600) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7)); // 0.7 quality JPEG
      };
      img.onerror = () => resolve(base64Str);
    });
  }

  // --- ELEMENT SELECTORS ---
  const sections = document.querySelectorAll(".page-section");
  const navItems = document.querySelectorAll(".nav-item");

  // Modals
  const tradeModal = document.getElementById("tradeModal");
  const optionModal = document.getElementById("optionModal");
  const analysisModal = document.getElementById("analysisModal");
  const lightboxModal = document.getElementById("lightboxModal");

  // Forms
  const tradeForm = document.getElementById("tradeForm");
  const optionForm = document.getElementById("optionForm");
  const analysisForm = document.getElementById("analysisForm");

  // Input elements
  const calendarDateInput = document.getElementById("calendarDate");

  // --- TOAST SERVICE ---
  function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.className = "toast";
    }, 3000);
  }

  // --- NAVIGATION SYSTEM ---
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetSectionId = item.getAttribute("data-section");
      
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      sections.forEach((sec) => {
        if (sec.id === targetSectionId) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });

      renderAllViews();
    });
  });

  // --- MODAL UTILS ---
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-close");
      closeModal(document.getElementById(targetId));
    });
  });

  [tradeModal, optionModal, analysisModal].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(tradeModal);
      closeModal(optionModal);
      closeModal(analysisModal);
      closeLightbox();
    }
  });

  // --- TRADE CREATE / EDIT / DELETE ---

  document.getElementById("addEquityBtn").addEventListener("click", () => {
    tradeForm.reset();
    document.getElementById("tradeId").value = "";
    document.getElementById("tradeModalTitle").textContent = "Add Equity Trade";
    document.getElementById("buyDate").value = new Date().toISOString().split("T")[0];
    openModal(tradeModal);
  });

  document.getElementById("addOptionBtn").addEventListener("click", () => {
    optionForm.reset();
    document.getElementById("optionId").value = "";
    document.getElementById("optionModalTitle").textContent = "Add Option Trade";
    document.getElementById("optionBuyDate").value = new Date().toISOString().split("T")[0];
    document.getElementById("expiry").value = new Date().toISOString().split("T")[0];
    openModal(optionModal);
  });

  tradeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const tradeId = document.getElementById("tradeId").value;
    const isEdit = !!tradeId;

    const tradeData = {
      id: isEdit ? tradeId : "eq_" + Date.now(),
      type: "equity",
      symbol: document.getElementById("symbol").value.toUpperCase().trim(),
      quantity: parseInt(document.getElementById("quantity").value, 10),
      buyPrice: parseFloat(document.getElementById("buyPrice").value),
      sellPrice: document.getElementById("sellPrice").value ? parseFloat(document.getElementById("sellPrice").value) : null,
      buyDate: document.getElementById("buyDate").value,
      sellDate: document.getElementById("sellDate").value || null,
      entryTime: document.getElementById("entryTime").value || null,
      exitTime: document.getElementById("exitTime").value || null,
      notes: document.getElementById("tradeNotes").value || ""
    };

    if (isEdit) {
      state.trades = state.trades.map(t => t.id === tradeId ? tradeData : t);
      showToast("Equity trade updated");
    } else {
      state.trades.push(tradeData);
      showToast("Equity trade added");
    }

    saveToStorage();
    closeModal(tradeModal);
    renderAllViews();
  });

  optionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const optionId = document.getElementById("optionId").value;
    const isEdit = !!optionId;

    const optionData = {
      id: isEdit ? optionId : "op_" + Date.now(),
      type: "option",
      symbol: document.getElementById("optionSymbol").value.toUpperCase().trim(),
      expiry: document.getElementById("expiry").value,
      strike: parseFloat(document.getElementById("strike").value),
      cepe: document.getElementById("cepe").value,
      lots: parseInt(document.getElementById("lots").value, 10),
      quantity: parseInt(document.getElementById("optionQty").value, 10),
      buyPrice: parseFloat(document.getElementById("buyPremium").value),
      sellPrice: document.getElementById("sellPremium").value ? parseFloat(document.getElementById("sellPremium").value) : null,
      buyDate: document.getElementById("optionBuyDate").value,
      sellDate: document.getElementById("optionSellDate").value || null,
      notes: document.getElementById("optionNotes").value || ""
    };

    if (isEdit) {
      state.trades = state.trades.map(t => t.id === optionId ? optionData : t);
      showToast("Option trade updated");
    } else {
      state.trades.push(optionData);
      showToast("Option trade added");
    }

    saveToStorage();
    closeModal(optionModal);
    renderAllViews();
  });

  window.editTrade = function(id) {
    const trade = state.trades.find(t => t.id === id);
    if (!trade) return;

    if (trade.type === "equity") {
      document.getElementById("tradeId").value = trade.id;
      document.getElementById("symbol").value = trade.symbol;
      document.getElementById("quantity").value = trade.quantity;
      document.getElementById("buyPrice").value = trade.buyPrice;
      document.getElementById("sellPrice").value = trade.sellPrice || "";
      document.getElementById("buyDate").value = trade.buyDate;
      document.getElementById("sellDate").value = trade.sellDate || "";
      document.getElementById("entryTime").value = trade.entryTime || "";
      document.getElementById("exitTime").value = trade.exitTime || "";
      document.getElementById("tradeNotes").value = trade.notes || "";
      document.getElementById("tradeModalTitle").textContent = "Edit Equity Trade";
      openModal(tradeModal);
    } else {
      document.getElementById("optionId").value = trade.id;
      document.getElementById("optionSymbol").value = trade.symbol;
      document.getElementById("expiry").value = trade.expiry;
      document.getElementById("strike").value = trade.strike;
      document.getElementById("cepe").value = trade.cepe;
      document.getElementById("lots").value = trade.lots;
      document.getElementById("optionQty").value = trade.quantity;
      document.getElementById("buyPremium").value = trade.buyPrice;
      document.getElementById("sellPremium").value = trade.sellPrice || "";
      document.getElementById("optionBuyDate").value = trade.buyDate;
      document.getElementById("optionSellDate").value = trade.sellDate || "";
      document.getElementById("optionNotes").value = trade.notes || "";
      document.getElementById("optionModalTitle").textContent = "Edit Option Trade";
      openModal(optionModal);
    }
  };

  window.deleteTrade = function(id) {
    if (confirm("Are you sure you want to delete this trade?")) {
      state.trades = state.trades.filter(t => t.id !== id);
      state.analyses = state.analyses.filter(a => a.tradeId !== id);
      saveToStorage();
      renderAllViews();
      showToast("Trade deleted", "warning");
    }
  };

  // --- ANALYZE AND BEHAVIOR SYSTEM ---
  let tempScreenshots = [];

  window.openAnalysis = function(tradeId) {
    analysisForm.reset();
    document.getElementById("analysisTradeId").value = tradeId;
    tempScreenshots = [];

    document.querySelectorAll('input[name="mistakeCheck"]').forEach(cb => cb.checked = false);
    document.getElementById("customMistake").value = "";

    renderScreenshotPreviews();

    const existing = state.analyses.find(a => a.tradeId === tradeId);
    if (existing) {
      document.getElementById("strategy").value = existing.strategy || "Breakout";
      document.getElementById("emotion").value = existing.emotion || "Calm";
      document.getElementById("marketCondition").value = existing.marketCondition || "Bullish";
      document.getElementById("stopLoss").value = existing.stopLoss || "";
      document.getElementById("target").value = existing.target || "";
      document.getElementById("tradeRating").value = existing.rating || "3";
      document.getElementById("entryReason").value = existing.entryReason || "";
      document.getElementById("exitReason").value = existing.exitReason || "";
      document.getElementById("lessonLearned").value = existing.lesson || "";

      const mistakes = existing.mistakes || [];
      const predefined = ["Late Entry", "Early Exit", "No Stop Loss", "FOMO", "Over Trading", "Oversized Position"];
      
      mistakes.forEach(m => {
        const checkbox = document.querySelector(`input[name="mistakeCheck"][value="${m}"]`);
        if (checkbox) {
          checkbox.checked = true;
        } else if (!predefined.includes(m)) {
          document.getElementById("customMistake").value = m;
        }
      });

      if (existing.screenshots) {
        tempScreenshots = [...existing.screenshots];
      }
    }

    renderScreenshotPreviews();
    openModal(analysisModal);
  };

  document.getElementById("analysisScreenshots").addEventListener("change", async (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const compressed = await compressImage(ev.target.result);
        tempScreenshots.push({
          id: "ss_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          src: compressed
        });
        renderScreenshotPreviews();
      };
      reader.readAsDataURL(file);
    }
  });

  function renderScreenshotPreviews() {
    const previewContainer = document.getElementById("screenshotPreview");
    if (!previewContainer) return;
    previewContainer.innerHTML = "";

    tempScreenshots.forEach((ss, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "ss-thumb-container";
      
      const img = document.createElement("img");
      img.src = ss.src;
      img.alt = "Screenshot Thumbnail";
      img.addEventListener("click", () => {
        openLightbox(tempScreenshots, idx);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "ss-delete-btn";
      deleteBtn.innerHTML = "✖";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        tempScreenshots.splice(idx, 1);
        renderScreenshotPreviews();
      });

      wrapper.appendChild(img);
      wrapper.appendChild(deleteBtn);
      previewContainer.appendChild(wrapper);
    });
  }

  analysisForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const tradeId = document.getElementById("analysisTradeId").value;
    
    const mistakes = [];
    document.querySelectorAll('input[name="mistakeCheck"]:checked').forEach(cb => {
      mistakes.push(cb.value);
    });

    const customVal = document.getElementById("customMistake").value.trim();
    if (customVal && !mistakes.includes(customVal)) {
      mistakes.push(customVal);
    }

    const analysisData = {
      tradeId: tradeId,
      strategy: document.getElementById("strategy").value,
      emotion: document.getElementById("emotion").value,
      marketCondition: document.getElementById("marketCondition").value,
      stopLoss: parseFloat(document.getElementById("stopLoss").value) || null,
      target: parseFloat(document.getElementById("target").value) || null,
      rating: parseInt(document.getElementById("tradeRating").value, 10),
      entryReason: document.getElementById("entryReason").value || "",
      exitReason: document.getElementById("exitReason").value || "",
      lesson: document.getElementById("lessonLearned").value || "",
      mistakes: mistakes,
      screenshots: tempScreenshots
    };

    const existingIdx = state.analyses.findIndex(a => a.tradeId === tradeId);
    if (existingIdx > -1) {
      state.analyses[existingIdx] = analysisData;
    } else {
      state.analyses.push(analysisData);
    }

    saveToStorage();
    closeModal(analysisModal);
    renderAllViews();
    showToast("Trade analysis saved");
  });

  // --- LIGHTBOX GALLERY SYSTEM ---
  function openLightbox(imageList, startIndex = 0) {
    if (!imageList || imageList.length === 0) return;
    state.currentLightboxImages = imageList;
    state.currentLightboxIndex = startIndex;
    
    updateLightboxUI();
    lightboxModal.classList.add("active");
  }

  function closeLightbox() {
    lightboxModal.classList.remove("active");
  }

  function updateLightboxUI() {
    const img = document.getElementById("lightboxImg");
    const counter = document.getElementById("lightboxCounter");
    if (!img) return;

    const currentItem = state.currentLightboxImages[state.currentLightboxIndex];
    if (currentItem) {
      img.src = currentItem.src;
      counter.textContent = `${state.currentLightboxIndex + 1} / ${state.currentLightboxImages.length}`;
    }
  }

  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  
  document.getElementById("lightboxPrev").addEventListener("click", () => {
    if (state.currentLightboxImages.length === 0) return;
    state.currentLightboxIndex = (state.currentLightboxIndex - 1 + state.currentLightboxImages.length) % state.currentLightboxImages.length;
    updateLightboxUI();
  });

  document.getElementById("lightboxNext").addEventListener("click", () => {
    if (state.currentLightboxImages.length === 0) return;
    state.currentLightboxIndex = (state.currentLightboxIndex + 1) % state.currentLightboxImages.length;
    updateLightboxUI();
  });

  lightboxModal.addEventListener("click", (e) => {
    if (e.target === lightboxModal || e.target.classList.contains("lightbox-container")) {
      closeLightbox();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (!lightboxModal.classList.contains("active")) return;
    if (e.key === "ArrowLeft") {
      document.getElementById("lightboxPrev").click();
    } else if (e.key === "ArrowRight") {
      document.getElementById("lightboxNext").click();
    }
  });

  // --- CALCULATION AND FINANCIAL METRICS HELPER ---
  function calculatePL(trade) {
    if (trade.sellPrice === null || trade.sellPrice === undefined) return 0;
    return (trade.sellPrice - trade.buyPrice) * trade.quantity;
  }

  function getFinancials() {
    const closed = state.trades.filter(t => t.sellPrice !== null);
    let grossProfit = 0;
    let grossLoss = 0;
    let totalPLVal = 0;
    let wins = 0;

    closed.forEach((t) => {
      const pl = calculatePL(t);
      totalPLVal += pl;
      if (pl > 0) {
        grossProfit += pl;
        wins++;
      } else if (pl < 0) {
        grossLoss += Math.abs(pl);
      }
    });

    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99.9 : 0.0) : (grossProfit / grossLoss);
    const winRate = closed.length === 0 ? 0 : Math.round((wins / closed.length) * 100);

    let totalRR = 0;
    let analyzedCount = 0;
    state.analyses.forEach(a => {
      const trade = state.trades.find(t => t.id === a.tradeId);
      if (trade && a.stopLoss && a.target) {
        const risk = Math.abs(trade.buyPrice - a.stopLoss);
        const reward = Math.abs(a.target - trade.buyPrice);
        if (risk > 0) {
          totalRR += (reward / risk);
          analyzedCount++;
        }
      }
    });
    const avgRR = analyzedCount === 0 ? 0 : parseFloat((totalRR / analyzedCount).toFixed(2));

    const todayStr = new Date().toISOString().split("T")[0];
    let todayPL = 0;
    closed.forEach(t => {
      if (t.sellDate === todayStr) {
        todayPL += calculatePL(t);
      }
    });

    return {
      totalPL: totalPLVal,
      todayPL: todayPL,
      winRate: winRate,
      profitFactor: parseFloat(profitFactor).toFixed(2),
      avgRR: avgRR,
      closedCount: closed.length
    };
  }

  // --- DYNAMIC GRAPHICS / HTML5 CANVAS DRAWING ---
  function drawEquityCurve() {
    const canvas = document.getElementById("equityChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 280 * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = 280;

    ctx.clearRect(0, 0, width, height);

    const closedTrades = state.trades
      .filter(t => t.sellPrice !== null && t.sellDate)
      .sort((a, b) => new Date(a.sellDate) - new Date(b.sellDate));

    const labelEl = document.getElementById("equityChartLabel");
    if (closedTrades.length === 0) {
      if (labelEl) labelEl.textContent = "No closed trades yet";
      ctx.fillStyle = "var(--text-muted)";
      ctx.font = "14px var(--font-sans)";
      ctx.textAlign = "center";
      ctx.fillText("Log closed trades to display equity progression curve", width / 2, height / 2);
      return;
    }

    let balance = 0;
    const points = [0];
    closedTrades.forEach(t => {
      balance += calculatePL(t);
      points.push(balance);
    });

    if (labelEl) {
      labelEl.textContent = `Ending P&L: Rs ${balance.toLocaleString()}`;
    }

    const minVal = Math.min(...points, 0);
    const maxVal = Math.max(...points, 0);
    const valRange = (maxVal - minVal) || 1000;

    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 30;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    ctx.strokeStyle = "var(--border)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "var(--text-muted)";
    ctx.font = "10px var(--font-mono)";

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const val = minVal + (valRange * i) / gridLines;
      const y = padTop + plotHeight - (plotHeight * i) / gridLines;
      
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.textAlign = "right";
      ctx.fillText(`Rs ${Math.round(val)}`, padLeft - 8, y + 3);
    }

    const zeroY = padTop + plotHeight - (plotHeight * (0 - minVal)) / valRange;
    if (zeroY >= padTop && zeroY <= padTop + plotHeight) {
      ctx.strokeStyle = "#94a3b8";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, zeroY);
      ctx.lineTo(width - padRight, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = balance >= 0 ? "var(--success)" : "var(--danger)";
    ctx.lineWidth = 3.5;
    ctx.lineJoin = "round";
    ctx.beginPath();

    const getCoord = (idx, val) => {
      const x = padLeft + (plotWidth * idx) / (points.length - 1);
      const y = padTop + plotHeight - (plotHeight * (val - minVal)) / valRange;
      return { x, y };
    };

    const first = getCoord(0, points[0]);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < points.length; i++) {
      const coord = getCoord(i, points[i]);
      ctx.lineTo(coord.x, coord.y);
    }
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotHeight);
    if (balance >= 0) {
      grad.addColorStop(0, "rgba(22, 163, 74, 0.2)");
      grad.addColorStop(1, "rgba(22, 163, 74, 0.0)");
    } else {
      grad.addColorStop(0, "rgba(220, 38, 38, 0.2)");
      grad.addColorStop(1, "rgba(220, 38, 38, 0.0)");
    }
    ctx.fillStyle = grad;
    ctx.lineTo(width - padRight, zeroY);
    ctx.lineTo(padLeft, zeroY);
    ctx.closePath();
    ctx.fill();

    points.forEach((pt, idx) => {
      const coord = getCoord(idx, pt);
      ctx.fillStyle = pt >= 0 ? "var(--success)" : "var(--danger)";
      ctx.beginPath();
      ctx.arc(coord.x, coord.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawWinLossMix() {
    const canvas = document.getElementById("mixChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 280 * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = 280;

    ctx.clearRect(0, 0, width, height);

    const closed = state.trades.filter(t => t.sellPrice !== null);
    const labelEl = document.getElementById("mixChartLabel");

    if (closed.length === 0) {
      if (labelEl) labelEl.textContent = "Waiting for data";
      ctx.fillStyle = "var(--text-muted)";
      ctx.font = "14px var(--font-sans)";
      ctx.textAlign = "center";
      ctx.fillText("No settling metrics found", width / 2, height / 2);
      return;
    }

    let winners = 0;
    let losers = 0;
    closed.forEach(t => {
      if (calculatePL(t) > 0) winners++;
      else if (calculatePL(t) < 0) losers++;
    });

    const totalRated = winners + losers;
    if (labelEl) {
      labelEl.textContent = `Winners: ${winners} | Losers: ${losers}`;
    }

    if (totalRated === 0) {
      ctx.fillStyle = "var(--text-muted)";
      ctx.font = "14px var(--font-sans)";
      ctx.textAlign = "center";
      ctx.fillText("Break-even trades logged", width / 2, height / 2);
      return;
    }

    const winAngle = (winners / totalRated) * Math.PI * 2;
    const centerX = width / 2;
    const centerY = height / 2 - 10;
    const radius = 65;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + winAngle);
    ctx.fillStyle = "#16a34a";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2 + winAngle, -Math.PI / 2 + Math.PI * 2);
    ctx.fillStyle = "#dc2626";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "var(--bg-panel)";
    ctx.fill();

    ctx.fillStyle = "var(--text-primary)";
    ctx.font = "bold 16px var(--font-sans)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round((winners / totalRated) * 100)}%`, centerX, centerY - 2);
    ctx.fillStyle = "var(--text-muted)";
    ctx.font = "9px var(--font-sans)";
    ctx.fillText("WIN RATE", centerX, centerY + 12);
  }

  // --- VIEW RENDERING ENGINE ---

  function renderDashboard() {
    const f = getFinancials();
    
    document.getElementById("totalPL").textContent = (f.totalPL >= 0 ? "Rs " : "-Rs ") + Math.abs(f.totalPL).toLocaleString();
    document.getElementById("totalPL").className = f.totalPL >= 0 ? "pl-positive" : "pl-negative";
    
    document.getElementById("todayPL").textContent = (f.todayPL >= 0 ? "Rs " : "-Rs ") + Math.abs(f.todayPL).toLocaleString();
    document.getElementById("todayPL").className = f.todayPL >= 0 ? "pl-positive" : "pl-negative";

    document.getElementById("winRate").textContent = `${f.winRate}%`;
    document.getElementById("winRateNote").textContent = `${f.closedCount} closed trades`;

    document.getElementById("profitFactor").textContent = f.profitFactor;
    document.getElementById("avgRR").textContent = f.avgRR.toFixed(2);

    let disciplinePenalty = 0;
    state.analyses.forEach(a => {
      if (a.mistakes && a.mistakes.length > 0) {
        disciplinePenalty += (a.mistakes.length * 12);
      }
    });
    const finalScore = Math.max(10, 100 - disciplinePenalty);
    document.getElementById("aiScore").textContent = finalScore;
    document.getElementById("aiScoreNote").textContent = finalScore > 85 ? "Excellent execution" : "High behavioral leakage";

    drawEquityCurve();
    drawWinLossMix();

    const eqBody = document.getElementById("equityTradeTable");
    const opBody = document.getElementById("optionTradeTable");
    
    eqBody.innerHTML = "";
    opBody.innerHTML = "";

    const equities = state.trades.filter(t => t.type === "equity");
    const options = state.trades.filter(t => t.type === "option");

    equities.slice(-15).forEach(trade => {
      const pl = calculatePL(trade);
      const isClosed = trade.sellPrice !== null;
      const analysis = state.analyses.find(a => a.tradeId === trade.id);
      const analyzeBtnHtml = analysis
        ? `<button class="btn secondary btn-sm" onclick="openAnalysis('${trade.id}')">★ ${analysis.rating}/5</button>`
        : `<button class="btn primary btn-sm" onclick="openAnalysis('${trade.id}')">Analyze</button>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${trade.symbol}</strong></td>
        <td>${trade.quantity}</td>
        <td>Rs ${trade.buyPrice}</td>
        <td>${isClosed ? "Rs " + trade.sellPrice : "-"}</td>
        <td><span class="status-badge ${isClosed ? "closed" : "open"}">${isClosed ? "Closed" : "Open"}</span></td>
        <td class="${pl >= 0 ? "pl-positive" : "pl-negative"}">${isClosed ? "Rs " + pl.toLocaleString() : "-"}</td>
        <td>
          <div class="action-cell">
            <button class="btn ghost btn-sm" onclick="editTrade('${trade.id}')">Edit</button>
            ${analyzeBtnHtml}
            <button class="btn danger-ghost btn-sm" onclick="deleteTrade('${trade.id}')">Delete</button>
          </div>
        </td>
      `;
      eqBody.appendChild(tr);
    });

    options.slice(-15).forEach(trade => {
      const pl = calculatePL(trade);
      const isClosed = trade.sellPrice !== null;
      const analysis = state.analyses.find(a => a.tradeId === trade.id);
      const analyzeBtnHtml = analysis
        ? `<button class="btn secondary btn-sm" onclick="openAnalysis('${trade.id}')">★ ${analysis.rating}/5</button>`
        : `<button class="btn primary btn-sm" onclick="openAnalysis('${trade.id}')">Analyze</button>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${trade.symbol}</strong></td>
        <td>${trade.expiry}</td>
        <td>${trade.strike}</td>
        <td>${trade.cepe}</td>
        <td>${trade.quantity} (${trade.lots} L)</td>
        <td><span class="status-badge ${isClosed ? "closed" : "open"}">${isClosed ? "Closed" : "Open"}</span></td>
        <td class="${pl >= 0 ? "pl-positive" : "pl-negative"}">${isClosed ? "Rs " + pl.toLocaleString() : "-"}</td>
        <td>
          <div class="action-cell">
            <button class="btn ghost btn-sm" onclick="editTrade('${trade.id}')">Edit</button>
            ${analyzeBtnHtml}
            <button class="btn danger-ghost btn-sm" onclick="deleteTrade('${trade.id}')">Delete</button>
          </div>
        </td>
      `;
      opBody.appendChild(tr);
    });
  }

  let currentFilter = "all";
  const filterButtons = document.querySelectorAll("#journalFilters button");

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.getAttribute("data-filter");
      renderJournal();
    });
  });

  function renderJournal() {
    const journalBody = document.getElementById("journalTable");
    if (!journalBody) return;
    journalBody.innerHTML = "";

    let filtered = [...state.trades];

    if (currentFilter === "equity") {
      filtered = filtered.filter(t => t.type === "equity");
    } else if (currentFilter === "option") {
      filtered = filtered.filter(t => t.type === "option");
    } else if (currentFilter === "open") {
      filtered = filtered.filter(t => t.sellPrice === null);
    } else if (currentFilter === "closed") {
      filtered = filtered.filter(t => t.sellPrice !== null);
    } else if (currentFilter === "profit") {
      filtered = filtered.filter(t => t.sellPrice !== null && calculatePL(t) > 0);
    } else if (currentFilter === "loss") {
      filtered = filtered.filter(t => t.sellPrice !== null && calculatePL(t) < 0);
    }

    filtered.forEach(trade => {
      const pl = calculatePL(trade);
      const isClosed = trade.sellPrice !== null;
      const analysis = state.analyses.find(a => a.tradeId === trade.id);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${trade.buyDate}</td>
        <td><span class="eyebrow">${trade.type.toUpperCase()}</span></td>
        <td><strong>${trade.symbol}</strong></td>
        <td>${analysis ? analysis.strategy : "-"}</td>
        <td>${analysis ? analysis.emotion : "-"}</td>
        <td><span class="status-badge ${isClosed ? "closed" : "open"}">${isClosed ? "Closed" : "Open"}</span></td>
        <td class="${pl >= 0 ? "pl-positive" : "pl-negative"}">${isClosed ? "Rs " + pl.toLocaleString() : "-"}</td>
        <td>
          <button class="btn ${analysis ? "secondary" : "primary"}" onclick="openAnalysis('${trade.id}')">
            ${analysis ? "★ Rated (" + analysis.rating + "/5)" : "Analyze"}
          </button>
        </td>
      `;
      journalBody.appendChild(tr);
    });
  }

  function renderAnalytics() {
    const totalCount = state.trades.length;
    const closedTrades = state.trades.filter(t => t.sellPrice !== null);
    const closedCount = closedTrades.length;

    let winners = [];
    let losers = [];
    let largestWin = 0;
    let largestWinSym = "-";
    let largestLoss = 0;
    let largestLossSym = "-";

    closedTrades.forEach(t => {
      const pl = calculatePL(t);
      if (pl > 0) {
        winners.push(pl);
        if (pl > largestWin) {
          largestWin = pl;
          largestWinSym = t.symbol;
        }
      } else if (pl < 0) {
        const absL = Math.abs(pl);
        losers.push(absL);
        if (absL > largestLoss) {
          largestLoss = absL;
          largestLossSym = t.symbol;
        }
      }
    });

    const avgWinner = winners.length === 0 ? 0 : Math.round(winners.reduce((a,b)=>a+b, 0) / winners.length);
    const avgLoser = losers.length === 0 ? 0 : Math.round(losers.reduce((a,b)=>a+b, 0) / losers.length);

    document.getElementById("analyticsTotalTrades").textContent = totalCount;
    document.getElementById("analyticsClosedTrades").textContent = closedCount;
    document.getElementById("avgWinner").textContent = `Rs ${avgWinner.toLocaleString()}`;
    document.getElementById("avgLoser").textContent = `Rs ${avgLoser.toLocaleString()}`;
    document.getElementById("largestWin").textContent = `Rs ${largestWin.toLocaleString()}`;
    document.getElementById("largestWinSymbol").textContent = largestWinSym;
    document.getElementById("largestLoss").textContent = `Rs ${largestLoss.toLocaleString()}`;
    document.getElementById("largestLossSymbol").textContent = largestLossSym;

    renderGlobalScreenshots();
  }

  document.getElementById("analyticsScreenshots").addEventListener("change", async (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const compressed = await compressImage(ev.target.result);
        state.analyticsScreenshots.push({
          id: "gss_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          src: compressed
        });
        saveToStorage();
        renderGlobalScreenshots();
      };
      reader.readAsDataURL(file);
    }
  });

  function renderGlobalScreenshots() {
    const previewContainer = document.getElementById("analyticsScreenshotPreview");
    if (!previewContainer) return;
    previewContainer.innerHTML = "";

    state.analyticsScreenshots.forEach((ss, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "ss-thumb-container";

      const img = document.createElement("img");
      img.src = ss.src;
      img.alt = "Study Chart Pattern";
      img.addEventListener("click", () => {
        openLightbox(state.analyticsScreenshots, idx);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "ss-delete-btn";
      deleteBtn.innerHTML = "✖";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.analyticsScreenshots.splice(idx, 1);
        saveToStorage();
        renderGlobalScreenshots();
      });

      wrapper.appendChild(img);
      wrapper.appendChild(deleteBtn);
      previewContainer.appendChild(wrapper);
    });
  }

  function renderPortfolio() {
    const openTrades = state.trades.filter(t => t.sellPrice === null);
    const closedTrades = state.trades.filter(t => t.sellPrice !== null);

    let capitalDeployed = 0;
    let optionExposure = 0;
    let openPositions = openTrades.length;

    let realizedPL = closedTrades.reduce((acc, t) => acc + calculatePL(t), 0);

    openTrades.forEach(t => {
      if (t.type === "equity") {
        capitalDeployed += (t.buyPrice * t.quantity);
      } else {
        optionExposure += (t.buyPrice * t.quantity);
      }
    });

    document.getElementById("capitalDeployed").textContent = `Rs ${capitalDeployed.toLocaleString()}`;
    document.getElementById("realizedPL").textContent = (realizedPL >= 0 ? "Rs " : "-Rs ") + Math.abs(realizedPL).toLocaleString();
    document.getElementById("realizedPL").className = realizedPL >= 0 ? "pl-positive" : "pl-negative";
    document.getElementById("openPositions").textContent = openPositions;
    document.getElementById("optionExposure").textContent = `Rs ${optionExposure.toLocaleString()}`;

    const monitor = document.getElementById("riskMonitor");
    monitor.innerHTML = "";

    if (openTrades.length === 0) {
      monitor.innerHTML = `
        <div class="insight-card">
          <strong>No Active Risk</strong>
          <span>You currently hold 0 open positions. Risk parameters are perfectly clean.</span>
        </div>
      `;
      return;
    }

    openTrades.forEach(t => {
      const analysis = state.analyses.find(a => a.tradeId === t.id);
      const card = document.createElement("div");
      card.className = "insight-card";

      if (analysis) {
        card.innerHTML = `
          <strong>${t.symbol} (SL & Target active)</strong>
          <span>Stop Loss defined at <strong>Rs ${analysis.stopLoss || "Not set"}</strong>. Target is <strong>Rs ${analysis.target || "Not set"}</strong>. Strategy: ${analysis.strategy}.</span>
        `;
      } else {
        card.innerHTML = `
          <strong>${t.symbol} (UNPROTECTED FIELD RISK)</strong>
          <span style="color: var(--danger)">You have not logged active stop loss parameters for this position. Complete a trade analysis immediately to avoid tail risks.</span>
        `;
      }
      monitor.appendChild(card);
    });
  }

  if (calendarDateInput) {
    calendarDateInput.value = new Date().toISOString().split("T")[0];
    calendarDateInput.addEventListener("change", renderCalendar);
  }

  function renderCalendar() {
    const selectedDate = calendarDateInput.value;
    const tableBody = document.getElementById("calendarTradesTable");
    const plDisplay = document.getElementById("dailyPLDisplay");
    const countDisplay = document.getElementById("dailyTradeCount");

    if (!tableBody) return;
    tableBody.innerHTML = "";

    const dailyTrades = state.trades.filter(t => t.sellDate === selectedDate || (t.sellPrice === null && t.buyDate === selectedDate));
    let dailyPL = 0;
    let count = 0;

    dailyTrades.forEach(t => {
      const pl = calculatePL(t);
      if (t.sellPrice !== null) {
        dailyPL += pl;
        count++;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${t.symbol}</strong></td>
        <td><span class="eyebrow">${t.type}</span></td>
        <td><span class="status-badge ${t.sellPrice !== null ? "closed" : "open"}">${t.sellPrice !== null ? "Closed" : "Open"}</span></td>
        <td class="${pl >= 0 ? "pl-positive" : "pl-negative"}">${t.sellPrice !== null ? "Rs " + pl.toLocaleString() : "-"}</td>
        <td>${t.notes || "No notes available"}</td>
      `;
      tableBody.appendChild(tr);
    });

    plDisplay.textContent = (dailyPL >= 0 ? "Rs " : "-Rs ") + Math.abs(dailyPL).toLocaleString();
    plDisplay.className = dailyPL >= 0 ? "pl-positive" : "pl-negative";
    countDisplay.textContent = `${count} closed trades on this day`;
  }

  function renderPsychology() {
    let fear = 0;
    let greed = 0;
    let fomo = 0;
    let cleanExecution = 0;
    let totalAnalyzed = state.analyses.length;

    state.analyses.forEach(a => {
      if (a.emotion === "Fear") fear++;
      else if (a.emotion === "Greed") greed++;
      else if (a.emotion === "FOMO") fomo++;
      else cleanExecution++;
    });

    document.getElementById("fearCount").textContent = fear;
    document.getElementById("greedCount").textContent = greed;
    document.getElementById("fomoCount").textContent = fomo;

    const disciplinePct = totalAnalyzed === 0 ? 100 : Math.round((cleanExecution / totalAnalyzed) * 100);
    document.getElementById("disciplineScore").textContent = `${disciplinePct}%`;

    const report = document.getElementById("psychologyReport");
    if (disciplinePct > 80) {
      report.innerHTML = `
        <p><strong>Behavioral Edge Active</strong></p>
        <p>You show high emotional discipline. Your trading execution aligns with systematic protocols, reducing emotional leakage from FOMO and Revenge trade patterns.</p>
      `;
    } else {
      report.innerHTML = `
        <p><strong>Systemic Bleeding Detected</strong></p>
        <p>Fear, greed, or over-trading triggers are impacting trade outcomes. Standardize sizing limits and restrict late entries to protect capital reserves.</p>
      `;
    }
  }

  document.getElementById("generateReportBtn").addEventListener("click", () => {
    const closed = state.trades.filter(t => t.sellPrice !== null);
    if (closed.length === 0) {
      document.getElementById("reportOutput").textContent = "Log at least one closed trade to compile a professional summary report.";
      return;
    }

    const totalPLVal = closed.reduce((acc, t) => acc + calculatePL(t), 0);
    const winRate = Math.round((closed.filter(t => calculatePL(t) > 0).length / closed.length) * 100);

    const reportOutput = document.getElementById("reportOutput");
    reportOutput.innerHTML = `
      <div class="insight-card">
        <h3>Performance Summary Report</h3>
        <p><strong>Period of analysis:</strong> All active sessions</p>
        <p><strong>Performance Metric P&L:</strong> Rs ${totalPLVal.toLocaleString()}</p>
        <p><strong>Win Rate:</strong> ${winRate}%</p>
        <p><strong>System Discipline Rating:</strong> Strong compliance</p>
        <br>
        <p><em>This report has been successfully compiled from local persistent structures. Use the export functions to back up your journal records securely.</em></p>
      </div>
    `;
    showToast("Report compiled");
  });

  // --- JSON IMPORT / EXPORT CAPABILITIES ---
  
  document.getElementById("exportJsonBtn").addEventListener("click", () => {
    const dataStr = JSON.stringify({
      trades: state.trades,
      analyses: state.analyses,
      analyticsScreenshots: state.analyticsScreenshots
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradepro_journal_export_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup exported successfully");
  });

  document.getElementById("importJsonBtn").addEventListener("click", () => {
    document.getElementById("importFile").click();
  });

  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.trades && Array.isArray(parsed.trades)) {
          state.trades = parsed.trades;
          state.analyses = parsed.analyses || [];
          state.analyticsScreenshots = parsed.analyticsScreenshots || [];
          saveToStorage();
          renderAllViews();
          showToast("Data imported successfully");
        } else {
          showToast("Invalid import schema", "danger");
        }
      } catch (err) {
        showToast("Failed to parse file", "danger");
      }
    };
    reader.readAsText(file);
  });

  // --- CSV EXPORTER ---
  document.getElementById("exportCsvBtn").addEventListener("click", () => {
    const equities = state.trades.filter(t => t.type === "equity");
    if (equities.length === 0) {
      showToast("No equity trades to export", "warning");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Symbol,Quantity,Buy Price,Sell Price,Buy Date,Sell Date,P&L,Notes\n";

    equities.forEach(t => {
      const pl = calculatePL(t);
      csvContent += `"${t.symbol}",${t.quantity},${t.buyPrice},${t.sellPrice || ""},"${t.buyDate}","${t.sellDate || ""}",${pl},"${(t.notes || "").replace(/"/g, '""')}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const a = document.createElement("a");
    a.setAttribute("href", encodedUri);
    a.setAttribute("download", "tradepro_equity_trades.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("CSV exported successfully");
  });

  // --- API / AI COACH AND PATTERN FINDER INTEGRATION ---
  
  document.getElementById("runCoachBtn").addEventListener("click", async () => {
    const output = document.getElementById("aiOutput");
    if (!output) return;

    output.innerHTML = "Consulting Elite Trading Coach... Please wait while your trading behavior is analyzed...";
    document.getElementById("runCoachBtn").disabled = true;

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          trades: state.trades,
          analyses: state.analyses
        })
      });

      if (!response.ok) {
        throw new Error("Failed to connect to the coaching api server");
      }

      const data = await response.json();
      output.innerHTML = data.coachAdvice || "No insights returned from server.";
      showToast("AI Advice updated");
    } catch (err) {
      console.error(err);
      output.innerHTML = `<p style="color: var(--danger)">Error: ${err.message || "Failed to contact the AI server"}</p>`;
      showToast("AI Coach unreachable", "danger");
    } finally {
      document.getElementById("runCoachBtn").disabled = false;
    }
  });

  async function fetchAIPatterns() {
    const container = document.getElementById("patternInsights");
    if (!container) return;

    try {
      const response = await fetch("/api/patterns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          trades: state.trades,
          analyses: state.analyses
        })
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      const patterns = data.patterns || [];
      
      if (patterns.length === 0) {
        container.innerHTML = `
          <div class="insight-card">
            <strong>System Review Complete</strong>
            <span>Trade activity has been analyzed. Log more diverse setups to identify performance outliers.</span>
          </div>
        `;
        return;
      }

      container.innerHTML = "";
      patterns.forEach(p => {
        const card = document.createElement("div");
        card.className = "insight-card";
        card.innerHTML = `
          <strong>${p.title}</strong>
          <span>${p.body}</span>
        `;
        container.appendChild(card);
      });
    } catch (err) {
      container.innerHTML = `
        <div class="insight-card">
          <strong>Pattern Finder Local Mode</strong>
          <span>Log more setups with active ratings inside your journal to automatically reveal trade correlation insights.</span>
        </div>
      `;
    }
  }

  // --- INITIALIZE SYSTEM AND VIEWS ---
  function renderAllViews() {
    renderDashboard();
    renderJournal();
    renderAnalytics();
    renderPortfolio();
    renderCalendar();
    renderPsychology();
  }

  loadFromStorage();
  renderAllViews();
  fetchAIPatterns();
});