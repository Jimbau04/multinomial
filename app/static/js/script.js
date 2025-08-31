const ctx = document.getElementById("grafica").getContext("2d");
        let chart;
        let ultimoResultadoProbabilidad = null;

        // Funciones para cambiar tabs
        function cambiarTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });

            document.getElementById(tabName).classList.add('active');
            document.querySelector(`[onclick="cambiarTab('${tabName}')"]`).classList.add('active');
            
            document.getElementById('grafica-container').style.display = 'none';
        }

        // Formulario de simulación
        document.getElementById("formulario-simulacion").addEventListener("submit", async (e) => {
            e.preventDefault();

            const n_experimentos = parseInt(document.getElementById("n_experimentos").value);
            const categorias = document.getElementById("categorias").value.split(",").map(c => c.trim());
            const probabilidades = document.getElementById("probabilidades").value.split(",").map(Number);

            if (categorias.length !== probabilidades.length) {
                alert("El número de categorías debe coincidir con el número de probabilidades");
                return;
            }

            const suma = probabilidades.reduce((a, b) => a + b, 0);
            if (Math.abs(suma - 1.0) > 0.01) {
                alert(`Las probabilidades deben sumar 1.0 (suma actual: ${suma.toFixed(4)})`);
                return;
            }

            const payload = { n_experimentos, categorias, probabilidades };

            try {
                const res = await fetch("/multinomial", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                
                if (data.error) {
                    alert("Error: " + data.error);
                    return;
                }

                document.getElementById("resultado_texto").textContent = JSON.stringify(data, null, 2);
                document.getElementById("resultado-simulacion").style.display = 'block';

                crearGrafica(data.categorias, data.frecuencias_observadas, data.frecuencias_esperadas, "Simulación");

            } catch (error) {
                console.error("Error:", error);
                alert("Error al conectar con la API: " + error.message);
            }
        });

        // Formulario de probabilidad exacta
        document.getElementById("formulario-probabilidad").addEventListener("submit", async (e) => {
            e.preventDefault();

            const n_experimentos = parseInt(document.getElementById("n_experimentos_prob").value);
            const categorias = document.getElementById("categorias_prob").value.split(",").map(c => c.trim());
            const probabilidades = document.getElementById("probabilidades_prob").value.split(",").map(Number);
            const frecuencias_deseadas = document.getElementById("frecuencias_deseadas").value.split(",").map(Number);

            // Validaciones
            if (categorias.length !== probabilidades.length || probabilidades.length !== frecuencias_deseadas.length) {
                alert("Todas las listas deben tener la misma longitud");
                return;
            }

            const sumaProb = probabilidades.reduce((a, b) => a + b, 0);
            if (Math.abs(sumaProb - 1.0) > 0.01) {
                alert(`Las probabilidades deben sumar 1.0 (suma actual: ${sumaProb.toFixed(4)})`);
                return;
            }

            const sumaFreq = frecuencias_deseadas.reduce((a, b) => a + b, 0);
            if (sumaFreq !== n_experimentos) {
                alert(`Las frecuencias deben sumar ${n_experimentos} (suma actual: ${sumaFreq})`);
                return;
            }

            const payload = { n_experimentos, categorias, probabilidades, frecuencias_deseadas };

            try {
                const res = await fetch("/calcular-probabilidad", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                
                if (data.error) {
                    alert("Error: " + data.error);
                    return;
                }

                ultimoResultadoProbabilidad = payload;
                mostrarResultadoProbabilidad(data);

            } catch (error) {
                console.error("Error:", error);
                alert("Error al conectar con la API: " + error.message);
            }
        });

        // Botón de verificación
        document.getElementById("btn-verificar").addEventListener("click", async () => {
            if (!ultimoResultadoProbabilidad) return;

            try {
                const res = await fetch("/simular-verificacion", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ultimoResultadoProbabilidad)
                });

                const data = await res.json();
                
                if (data.error) {
                    alert("Error: " + data.error);
                    return;
                }

                mostrarVerificacion(data);

            } catch (error) {
                console.error("Error:", error);
                alert("Error al realizar la verificación: " + error.message);
            }
        });

        function mostrarResultadoProbabilidad(data) {
            const calculoHTML = `
                <div class="calculo-box">
                    <h4>📐 Cálculo Paso a Paso</h4>
                    <p><strong>Coeficiente multinomial:</strong> ${data.coeficiente_multinomial.toLocaleString()}</p>
                    <p><strong>Producto de probabilidades:</strong> ${data.producto_probabilidades.toExponential(6)}</p>
                    <div class="resultado-final">
                        <strong>P(${data.frecuencias_deseadas.join(',')}) = ${data.probabilidad_exacta.toExponential(8)}</strong>
                    </div>
                    <h5>Detalles por categoría:</h5>
                    ${data.detalles_calculo.map(detalle => 
                        `<p>• <strong>${detalle.categoria}:</strong> ${detalle.termino} = ${detalle.valor.toExponential(4)}</p>`
                    ).join('')}
                </div>
            `;
            
            const interpretacionHTML = `
                <div class="interpretacion-box">
                    <h4>💡 Interpretación</h4>
                    <div class="interpretacion-grid">
                        <div class="interpretacion-item">
                            <span>Probabilidad:</span>
                            <span><strong>${data.interpretacion.porcentaje.toExponential(6)}%</strong></span>
                        </div>
                        <div class="interpretacion-item">
                            <span>Frecuencia:</span>
                            <span><strong>1 en ${data.interpretacion.uno_en.toLocaleString()}</strong></span>
                        </div>
                        <div class="interpretacion-item">
                            <span>Clasificación:</span>
                            <span class="rareza"><strong>${data.interpretacion.rareza}</strong></span>
                        </div>
                        ${data.interpretacion.anos_si_diario > 0 ? 
                            `<div class="interpretacion-item">
                                <span>Si fuera diario:</span>
                                <span><strong>1 cada ${data.interpretacion.anos_si_diario.toLocaleString()} años</strong></span>
                            </div>` : 
                            ''}
                    </div>
                </div>
            `;

            document.getElementById("calculo-detallado").innerHTML = calculoHTML;
            document.getElementById("interpretacion").innerHTML = interpretacionHTML;
            document.getElementById("resultado-probabilidad").style.display = 'block';
            document.getElementById("btn-verificar").style.display = 'inline-block';

            crearGrafica(data.categorias, data.frecuencias_deseadas, data.frecuencias_esperadas, "Probabilidad Exacta");
        }

        function mostrarVerificacion(data) {
            const sim = data.simulacion;
            const verificacionHTML = `
                <div class="verificacion-box">
                    <h4>🧪 Verificación por Simulación</h4>
                    <p><strong>Simulaciones realizadas:</strong> ${sim.num_simulaciones.toLocaleString()}</p>
                    <p><strong>Éxitos encontrados:</strong> ${sim.exitos_encontrados.toLocaleString()}</p>
                    <p><strong>Probabilidad simulada:</strong> ${sim.probabilidad_simulada.toExponential(6)}</p>
                    <p><strong>Probabilidad teórica:</strong> ${sim.probabilidad_teorica.toExponential(6)}</p>
                    <p><strong>Error porcentual:</strong> ${sim.error_porcentual.toFixed(2)}%</p>
                    <p><strong>Concordancia:</strong> <span style="color: ${getConcordanciaColor(sim.concordancia)}; font-weight: bold;">${sim.concordancia.toUpperCase()}</span></p>
                    ${getConcordanciaMessage(sim.concordancia, sim.error_porcentual)}
                </div>
            `;

            document.getElementById("verificacion-detalle").innerHTML = verificacionHTML;
            document.getElementById("resultado-verificacion").style.display = 'block';
        }

        function getConcordanciaColor(concordancia) {
            switch(concordancia) {
                case 'excelente': return '#27ae60';
                case 'buena': return '#f39c12';
                case 'regular': return '#e74c3c';
                default: return '#7f8c8d';
            }
        }

        function getConcordanciaMessage(concordancia, errorPorcentual) {
            switch(concordancia) {
                case 'excelente':
                    return `<div style="background: #d5f4e6; padding: 10px; border-radius: 4px; margin-top: 10px; color: #27ae60;">✅ Excelente concordancia (${errorPorcentual.toFixed(2)}% de error)</div>`;
                case 'buena':
                    return `<div style="background: #fef9e7; padding: 10px; border-radius: 4px; margin-top: 10px; color: #f39c12;">✅ Buena concordancia (${errorPorcentual.toFixed(2)}% de error)</div>`;
                case 'regular':
                    return `<div style="background: #fdeaea; padding: 10px; border-radius: 4px; margin-top: 10px; color: #e74c3c;">⚠️ Concordancia regular. Considere aumentar simulaciones</div>`;
                default:
                    return '';
            }
        }

        function crearGrafica(labels, observadas, esperadas, titulo) {
            if (chart) {
                chart.destroy();
            }

            document.getElementById('grafica-container').style.display = 'block';

            chart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: titulo === "Simulación" ? "Frecuencias Observadas" : "Frecuencias Deseadas",
                            data: observadas,
                            backgroundColor: "rgba(54, 162, 235, 0.7)",
                            borderColor: "rgba(54, 162, 235, 1)",
                            borderWidth: 2
                        },
                        {
                            label: "Frecuencias Esperadas",
                            data: esperadas,
                            backgroundColor: "rgba(255, 206, 86, 0.7)",
                            borderColor: "rgba(255, 206, 86, 1)",
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `${titulo} - Comparación de Frecuencias`,
                            font: { 
                                size: 16,
                                weight: 'bold'
                            },
                            padding: 20
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                padding: 20,
                                font: { size: 12 }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Frecuencia'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Categorías'
                            }
                        }
                    }
                }
            });

            // Scroll a la gráfica
            setTimeout(() => {
                document.getElementById('grafica-container').scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }

        // Auto-completar frecuencias deseadas
        document.getElementById("n_experimentos_prob").addEventListener("input", actualizarFrecuenciasEsperadas);
        document.getElementById("probabilidades_prob").addEventListener("input", actualizarFrecuenciasEsperadas);
        document.getElementById("categorias_prob").addEventListener("input", actualizarFrecuenciasEsperadas);

        function actualizarFrecuenciasEsperadas() {
            try {
                const n = parseInt(document.getElementById("n_experimentos_prob").value);
                const categoriasText = document.getElementById("categorias_prob").value;
                const probabilidadesText = document.getElementById("probabilidades_prob").value;
                
                if (n > 0 && categoriasText && probabilidadesText) {
                    const categorias = categoriasText.split(",").map(c => c.trim());
                    const probabilidades = probabilidadesText.split(",").map(Number);
                    
                    if (categorias.length === probabilidades.length && 
                        probabilidades.every(p => !isNaN(p) && p > 0)) {
                        
                        // Calcular frecuencias esperadas
                        const frecuenciasEsperadas = probabilidades.map(p => Math.round(n * p));
                        
                        // Ajustar para que sumen exactamente n
                        const suma = frecuenciasEsperadas.reduce((a, b) => a + b, 0);
                        const diferencia = n - suma;
                        
                        if (diferencia !== 0) {
                            const maxIndex = probabilidades.indexOf(Math.max(...probabilidades));
                            frecuenciasEsperadas[maxIndex] += diferencia;
                        }
                        
                        document.getElementById("frecuencias_deseadas").value = frecuenciasEsperadas.join(",");
                    }
                }
            } catch (error) {
                console.log("Error en auto-completado:", error);
            }
        }

        // Inicializar con frecuencias esperadas
        actualizarFrecuenciasEsperadas();