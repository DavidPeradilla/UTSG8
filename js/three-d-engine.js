/**
 * ============================================================================
 * 3D Mathematical Canvas Engine for "Understanding the Self · Group 8"
 * Features:
 *   1. Hero Interactive 3D Celestial Sun, Orbital Rings & Constellation Nodes
 *   2. Kapwa 3D Concentric Ring Depth Funnel Visualizer
 *   3. 3D Card Physics Tilt & Glare Engine
 * ============================================================================
 */

(function () {
  'use strict';

  // --- Utility: 3D Vector & Matrix Math ---
  const V3 = {
    rotateY: function (p, rad) {
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: p.x * cos - p.z * sin,
        y: p.y,
        z: p.x * sin + p.z * cos
      };
    },
    rotateX: function (p, rad) {
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: p.x,
        y: p.y * cos - p.z * sin,
        z: p.y * sin + p.z * cos
      };
    },
    
    rotateZ: function (p, rad) {
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos,
        z: p.z
      };
    },
    project: function (p, width, height, fov, cameraZ) {
      const zDist = p.z + cameraZ;
      if (zDist <= 10) return null; // Behind camera
      const scale = fov / zDist;
      return {
        x: width / 2 + p.x * scale,
        y: height / 2 + p.y * scale,
        scale: scale,
        z: p.z
      };
    }
  };

  // ==========================================================================
  // 1. HERO 3D SCENE: Celestial Philippine Sun, Kapwa Orbitals & Constellation
  // ==========================================================================
  function initHero3DScene() {
    const canvas = document.getElementById('hero-3d-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Scene State
    let yaw = 0.2;
    let pitch = 0.15;
    let targetYaw = 0.2;
    let targetPitch = 0.15;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let mouseParallaxX = 0;
    let mouseParallaxY = 0;
    let ripples = [];

    // 8 Philippine Sun Rays (3D vectors)
    const rays = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      rays.push({
        angle: angle,
        innerR: 50,
        outerR: 140,
        width: 14
      });
    }

    // Concentric 3D Rings
    const rings = [
      { radius: 170, color: 'rgba(245, 183, 0, 0.45)', tiltX: 0.6, tiltZ: 0.2, speed: 0.006, label: 'SARILI' },
      { radius: 230, color: 'rgba(31, 224, 73, 0.45)', tiltX: -0.5, tiltZ: -0.4, speed: -0.004, label: 'KAPWA' },
      { radius: 290, color: 'rgba(56, 163, 255, 0.45)', tiltX: 0.3, tiltZ: 0.8, speed: 0.003, label: 'BAYAN' }
    ];

    // Constellation Particles
    const numParticles = 65;
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 160 + Math.random() * 160;
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        baseX: r * Math.sin(phi) * Math.cos(theta),
        baseY: r * Math.sin(phi) * Math.sin(theta),
        baseZ: r * Math.cos(phi),
        size: Math.random() * 2.5 + 1.5,
        color: ['#f5b700', '#1fe049', '#38a3ff', '#fdf0d5'][Math.floor(Math.random() * 4)],
        pulse: Math.random() * Math.PI * 2
      });
    }

    // 4 Key Civic Identity Anchor Nodes
    const anchorNodes = [
      { text: 'KAPWA (Shared Self)', x: 0, y: -200, z: 50, color: '#1fe049', radius: 10 },
      { text: 'BAYANIHAN (Solidarity)', x: 190, y: 70, z: -40, color: '#f5b700', radius: 9 },
      { text: 'PAKIKIBAKA (Struggle)', x: -180, y: 90, z: 60, color: '#f59e0b', radius: 9 },
      { text: 'PAGKAMAMAMAYAN (Civic Self)', x: 30, y: 170, z: -100, color: '#38a3ff', radius: 9 }
    ];

    // Mouse Interaction Handlers
    canvas.addEventListener('pointerdown', (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      canvas.setPointerCapture(e.pointerId);

      // Create click ripple
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left - width / 2;
      const clickY = e.clientY - rect.top - height / 2;
      ripples.push({ x: clickX, y: clickY, radius: 10, maxRadius: 350, alpha: 0.9 });
      if (window.AppAudio) window.AppAudio.playChime(440, 'triangle');
    });

    window.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / width - 0.5;
      const ny = (e.clientY - rect.top) / height - 0.5;
      mouseParallaxX = nx * 0.4;
      mouseParallaxY = ny * 0.3;

      if (isDragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        targetYaw += dx * 0.007;
        targetPitch += dy * 0.007;
        targetPitch = Math.max(-1.1, Math.min(1.1, targetPitch));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    });

    window.addEventListener('pointerup', () => { isDragging = false; });
    window.addEventListener('pointercancel', () => { isDragging = false; });

    // Animation Loop
    let time = 0;
    const fov = 500;
    const cameraZ = 650;

    function render() {
      requestAnimationFrame(render);
      time += 0.012;

      // Smooth camera interpolation
      if (!isDragging) {
        targetYaw += 0.0018; // Slow idle spin
      }
      yaw += (targetYaw + mouseParallaxX - yaw) * 0.08;
      pitch += (targetPitch + mouseParallaxY - pitch) * 0.08;

      ctx.clearRect(0, 0, width, height);

      // --- Draw Background Atmospheric Glow ---
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, 450);
      bgGrad.addColorStop(0, 'rgba(15, 147, 45, 0.16)');
      bgGrad.addColorStop(0.5, 'rgba(15, 92, 148, 0.09)');
      bgGrad.addColorStop(1, 'rgba(7, 14, 10, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // --- Draw Expanding Click Ripples ---
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        rip.radius += 5.5;
        rip.alpha -= 0.016;
        if (rip.alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(width / 2 + rip.x, height / 2 + rip.y, rip.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 183, 0, ${rip.alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Helper: transform 3D point with current yaw/pitch
      function transformPoint(p) {
        let pt = V3.rotateY(p, yaw);
        pt = V3.rotateX(pt, pitch);
        return pt;
      }

      // --- 1. Draw 3D Concentric Orbit Rings ---
      rings.forEach((ring, rIdx) => {
        const ringPoints = [];
        const segments = 64;
        const currentSpin = time * ring.speed * 20;

        for (let i = 0; i <= segments; i++) {
          const a = (i * Math.PI * 2) / segments;
          let pt = {
            x: Math.cos(a) * ring.radius,
            y: 0,
            z: Math.sin(a) * ring.radius
          };
          pt = V3.rotateX(pt, ring.tiltX);
          pt = V3.rotateZ(pt, ring.tiltZ);
          pt = V3.rotateY(pt, currentSpin);
          pt = transformPoint(pt);
          const proj = V3.project(pt, width, height, fov, cameraZ);
          if (proj) ringPoints.push(proj);
        }

        if (ringPoints.length > 2) {
          ctx.beginPath();
          ctx.moveTo(ringPoints[0].x, ringPoints[0].y);
          for (let i = 1; i < ringPoints.length; i++) {
            ctx.lineTo(ringPoints[i].x, ringPoints[i].y);
          }
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw an orbiting satellite node on this ring
        const satAngle = time * (0.8 + rIdx * 0.4);
        let satPt = {
          x: Math.cos(satAngle) * ring.radius,
          y: 0,
          z: Math.sin(satAngle) * ring.radius
        };
        satPt = V3.rotateX(satPt, ring.tiltX);
        satPt = V3.rotateZ(satPt, ring.tiltZ);
        satPt = V3.rotateY(satPt, currentSpin);
        satPt = transformPoint(satPt);
        const satProj = V3.project(satPt, width, height, fov, cameraZ);
        if (satProj) {
          ctx.beginPath();
          ctx.arc(satProj.x, satProj.y, 4.5 * satProj.scale, 0, Math.PI * 2);
          ctx.fillStyle = ring.color;
          ctx.shadowColor = ring.color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // --- 2. Draw 3D Constellation Nodes & Connecting Lines ---
      const projectedParticles = [];
      particles.forEach((p) => {
        p.pulse += 0.04;
        const wave = Math.sin(p.pulse) * 8;
        const pt = transformPoint({
          x: p.baseX + (p.baseX / 200) * wave,
          y: p.baseY + (p.baseY / 200) * wave,
          z: p.baseZ + (p.baseZ / 200) * wave
        });
        const proj = V3.project(pt, width, height, fov, cameraZ);
        if (proj) {
          proj.color = p.color;
          proj.size = p.size;
          projectedParticles.push(proj);
        }
      });

      // Connect near neighbors with 3D constellation chords
      ctx.lineWidth = 0.7;
      for (let i = 0; i < projectedParticles.length; i++) {
        for (let j = i + 1; j < projectedParticles.length; j++) {
          const p1 = projectedParticles[i];
          const p2 = projectedParticles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 75) {
            const alpha = (1 - dist / 75) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(253, 240, 213, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      // Draw particle dots
      projectedParticles.forEach((p) => {
        const radius = Math.max(0.8, p.size * p.scale);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      // --- 3. Draw The Central Philippine 8-Ray Golden Sun ---
      const sunCenter = transformPoint({ x: 0, y: 0, z: 0 });
      const sunCenterProj = V3.project(sunCenter, width, height, fov, cameraZ);

      if (sunCenterProj) {
        const sunRadius = 45 * sunCenterProj.scale;

        // Draw 8 Volumetric 3D Rays
        rays.forEach((ray) => {
          const a = ray.angle + time * 0.15;
          const cosA = Math.cos(a);
          const sinA = Math.sin(a);

          // Ray Base and Tip in 3D
          const base1 = transformPoint({ x: cosA * 42 - sinA * 8, y: sinA * 42 + cosA * 8, z: 0 });
          const base2 = transformPoint({ x: cosA * 42 + sinA * 8, y: sinA * 42 - cosA * 8, z: 0 });
          const tip = transformPoint({ x: cosA * 135, y: sinA * 135, z: Math.sin(a * 2 + time) * 15 });

          const pBase1 = V3.project(base1, width, height, fov, cameraZ);
          const pBase2 = V3.project(base2, width, height, fov, cameraZ);
          const pTip = V3.project(tip, width, height, fov, cameraZ);

          if (pBase1 && pBase2 && pTip) {
            const rayGrad = ctx.createLinearGradient(pBase1.x, pBase1.y, pTip.x, pTip.y);
            rayGrad.addColorStop(0, 'rgba(245, 183, 0, 0.7)');
            rayGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.45)');
            rayGrad.addColorStop(1, 'rgba(255, 220, 94, 0.85)');

            ctx.beginPath();
            ctx.moveTo(pBase1.x, pBase1.y);
            ctx.lineTo(pTip.x, pTip.y);
            ctx.lineTo(pBase2.x, pBase2.y);
            ctx.closePath();
            ctx.fillStyle = rayGrad;
            ctx.fill();

            // Tip spark
            ctx.beginPath();
            ctx.arc(pTip.x, pTip.y, 2.5 * pTip.scale, 0, Math.PI * 2);
            ctx.fillStyle = '#ffdc5e';
            ctx.shadowColor = '#ffdc5e';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });

        // Sun Center Sphere with Spherical Gradient Lighting
        const sphereGrad = ctx.createRadialGradient(
          sunCenterProj.x - sunRadius * 0.35,
          sunCenterProj.y - sunRadius * 0.35,
          sunRadius * 0.1,
          sunCenterProj.x,
          sunCenterProj.y,
          sunRadius
        );
        sphereGrad.addColorStop(0, '#fff4cc');
        sphereGrad.addColorStop(0.35, '#f5b700');
        sphereGrad.addColorStop(0.8, '#c27803');
        sphereGrad.addColorStop(1, '#663901');

        ctx.beginPath();
        ctx.arc(sunCenterProj.x, sunCenterProj.y, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.shadowColor = 'rgba(245, 183, 0, 0.6)';
        ctx.shadowBlur = 28;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Subtle decorative concentric inner ring
        ctx.beginPath();
        ctx.arc(sunCenterProj.x, sunCenterProj.y, sunRadius * 0.72, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(253, 240, 213, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // --- 4. Draw 4 Interactive Anchor Nodes with 3D Holographic Billboards ---
      anchorNodes.forEach((node) => {
        const pt = transformPoint(node);
        const proj = V3.project(pt, width, height, fov, cameraZ);
        if (!proj) return;

        // Glowing node core
        const r = node.radius * proj.scale;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Pulse ring around anchor
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, r * (1.6 + Math.sin(time * 3) * 0.3), 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3D Tag Label
        ctx.font = `600 ${Math.max(10, 12 * proj.scale)}px -apple-system, sans-serif`;
        ctx.fillStyle = '#fdf0d5';
        ctx.textAlign = 'center';
        ctx.fillText(node.text, proj.x, proj.y - r - 8);
      });
    }

    render();
  }

  // ==========================================================================
  // 2. KAPWA 3D CONCENTRIC DEPTH VISUALIZER (Section 09)
  // ==========================================================================
  function initKapwa3DVisualizer() {
    const canvas = document.getElementById('kapwa-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || 480;
      height = rect.height || 480;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // 8 Levels of Kapwa from Syllabus
    const kapwaLevels = [
      { level: 1, name: 'Pakikitungo', category: 'outsider', desc: 'Civility / Courtesy', yOffset: -140, radius: 175, color: '#38a3ff' },
      { level: 2, name: 'Pakikisalamuha', category: 'outsider', desc: 'Act of mixing / Socializing', yOffset: -100, radius: 155, color: '#38a3ff' },
      { level: 3, name: 'Pakikilahok', category: 'outsider', desc: 'Act of joining / Participating', yOffset: -60, radius: 135, color: '#38a3ff' },
      { level: 4, name: 'Pakikibagay', category: 'outsider', desc: 'Conformity / Adapting', yOffset: -20, radius: 115, color: '#38a3ff' },
      { level: 5, name: 'Pakikisama', category: 'outsider', desc: 'Camaraderie / United with group', yOffset: 20, radius: 95, color: '#38a3ff' },
      // The Sacred Threshold
      { level: 6, name: 'Pakikipagpalagayang-loob', category: 'insider', desc: 'Act of mutual trust & rapport', yOffset: 65, radius: 75, color: '#f5b700' },
      { level: 7, name: 'Pakikisangkot', category: 'insider', desc: 'Getting involved / Joining others', yOffset: 105, radius: 55, color: '#f5b700' },
      { level: 8, name: 'Pakikipagkaisa', category: 'insider', desc: 'Total oneness / Shared inner self', yOffset: 145, radius: 35, color: '#1fe049' }
    ];

    let activeLevel = 8; // Default focus: Pakikipagkaisa (Core)
    let rotX = 0.55;
    let rotY = 0.35;
    let targetRotY = 0.35;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    // Listen for level clicks in UI
    window.selectKapwaLevel = function (lvl) {
      activeLevel = lvl;
      if (window.AppAudio) window.AppAudio.playChime(350 + lvl * 60, 'sine');
      updateUiRowActive(lvl);
    };

    function updateUiRowActive(lvl) {
      document.querySelectorAll('.kapwa-level-row').forEach((row) => {
        const rLvl = parseInt(row.getAttribute('data-level'), 10);
        if (rLvl === lvl) {
          row.classList.add('active');
          row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          row.classList.remove('active');
        }
      });
    }

    canvas.addEventListener('pointerdown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      targetRotY += dx * 0.008;
      rotX += dy * 0.006;
      rotX = Math.max(0.1, Math.min(1.2, rotX));
      startX = e.clientX;
      startY = e.clientY;
    });

    window.addEventListener('pointerup', () => { isDragging = false; });

    // Click Raycasting on Canvas
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let closestLvl = null;
      let minDist = 30;

      kapwaLevels.forEach((item) => {
        if (item.projectedCenter) {
          const d = Math.hypot(item.projectedCenter.x - clickX, item.projectedCenter.y - clickY);
          if (d < minDist) {
            minDist = d;
            closestLvl = item.level;
          }
        }
      });

      if (closestLvl) {
        window.selectKapwaLevel(closestLvl);
      }
    });

    let kTime = 0;
    const fov = 420;
    const camZ = 550;

    function renderKapwa() {
      requestAnimationFrame(renderKapwa);
      kTime += 0.015;

      if (!isDragging) {
        targetRotY += 0.003;
      }
      rotY += (targetRotY - rotY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      // Central axis dashed stem
      const topStem = V3.project(V3.rotateX(V3.rotateY({ x: 0, y: -160, z: 0 }, rotY), rotX), width, height, fov, camZ);
      const botStem = V3.project(V3.rotateX(V3.rotateY({ x: 0, y: 170, z: 0 }, rotY), rotX), width, height, fov, camZ);
      if (topStem && botStem) {
        ctx.beginPath();
        ctx.moveTo(topStem.x, topStem.y);
        ctx.lineTo(botStem.x, botStem.y);
        ctx.strokeStyle = 'rgba(253, 240, 213, 0.15)';
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Render each concentric level ring
      kapwaLevels.forEach((item) => {
        const isSelected = item.level === activeLevel;
        const ringPoints = [];
        const segs = 48;

        for (let i = 0; i <= segs; i++) {
          const a = (i * Math.PI * 2) / segs;
          let p = {
            x: Math.cos(a) * item.radius,
            y: item.yOffset,
            z: Math.sin(a) * item.radius
          };
          p = V3.rotateY(p, rotY);
          p = V3.rotateX(p, rotX);
          const proj = V3.project(p, width, height, fov, camZ);
          if (proj) ringPoints.push(proj);
        }

        // Project center for hit testing and labeling
        let center = { x: 0, y: item.yOffset, z: 0 };
        center = V3.rotateY(center, rotY);
        center = V3.rotateX(center, rotX);
        item.projectedCenter = V3.project(center, width, height, fov, camZ);

        if (ringPoints.length > 2) {
          ctx.beginPath();
          ctx.moveTo(ringPoints[0].x, ringPoints[0].y);
          for (let i = 1; i < ringPoints.length; i++) {
            ctx.lineTo(ringPoints[i].x, ringPoints[i].y);
          }

          if (isSelected) {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 3.5;
            ctx.shadowColor = item.color;
            ctx.shadowBlur = 18;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Fill subtle plane
            ctx.fillStyle = item.category === 'insider' ? 'rgba(245, 183, 0, 0.12)' : 'rgba(56, 163, 255, 0.12)';
            ctx.fill();
          } else {
            ctx.strokeStyle = item.category === 'insider' ? 'rgba(245, 183, 0, 0.4)' : 'rgba(56, 163, 255, 0.3)';
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }
        }

        // Draw level marker bead & text
        if (item.projectedCenter) {
          const beadR = isSelected ? 6.5 : 3.5;
          ctx.beginPath();
          ctx.arc(item.projectedCenter.x, item.projectedCenter.y, beadR, 0, Math.PI * 2);
          ctx.fillStyle = item.color;
          ctx.fill();

          if (isSelected) {
            ctx.font = '700 13px -apple-system, sans-serif';
            ctx.fillStyle = '#fdf0d5';
            ctx.textAlign = 'left';
            ctx.fillText(`${item.level}. ${item.name}`, item.projectedCenter.x + 14, item.projectedCenter.y + 4);
          }
        }
      });
    }

    renderKapwa();
  }

  // ==========================================================================
  // 3. 3D CARD PHYSICS TILT & GLARE EFFECT
  // ==========================================================================
  function init3DCardTilt() {
    const cards = document.querySelectorAll('.tilt-card, .marker-card-3d');
    if (!cards.length) return;

    cards.forEach((card) => {
      let bounds;

      function onPointerEnter(e) {
        bounds = card.getBoundingClientRect();
      }

      function onPointerMove(e) {
        if (!bounds) bounds = card.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;

        // Set CSS custom variables for radial glare
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        // Compute tilt angles: max ±12 deg
        const centerX = bounds.width / 2;
        const centerY = bounds.height / 2;
        const rotateY = ((x - centerX) / centerX) * 10;
        const rotateX = -((y - centerY) / centerY) * 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(12px)`;
      }

      function onPointerLeave() {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      }

      card.addEventListener('pointerenter', onPointerEnter, { passive: true });
      card.addEventListener('pointermove', onPointerMove, { passive: true });
      card.addEventListener('pointerleave', onPointerLeave, { passive: true });
    });
  }

  // Initialize all 3D subsystems when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    initHero3DScene();
    initKapwa3DVisualizer();
    init3DCardTilt();
  });
})();
