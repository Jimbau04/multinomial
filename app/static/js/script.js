const ctx = document.getElementById("grafica").getContext("2d");
let chart;
let ultimoResultadoProbabilidad = null;

// Funciones para cambiar tabs
function cambiarTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar tab seleccionado
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[onclick="cambiarTab('${tabName}')"]`).classList.add('active');
    
    // Ocultar gráfica si se cambia de tab
    document.getElementById('grafica-container').style.display = 'none';
}

// Formulario de simulación
document.getElementById("formulario-simulacion").addEventListener("submit", async (e) => {
    e.preventDefault();

    const n_experimentos = parseInt(document.getElementById("n_experimentos").value);
    const categorias = document.getElementById("categorias").value.split(",").map(c => c.trim());
    const probabilidades = document.getElementById("probabilidades").value.split(",").map(Number);

    // Validación básica
    if (categorias.length !== probabilidades.length) {
        alert("El número de categorías debe coincidir con el número de probabilidades");
        return;
    }

    const payload = { n_experimentos, categorias, probabilidades };

    try {
        mostrarCargando("Realizando simulación...");
        
        const res = await fetch("/multinomial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        ocultarCargando();
        
        if (data.error) {
            alert("Error: " + data.error);
            return;
        }

        // Mostrar resultado
        document.getElementById("resultado_texto").textContent = JSON.stringify(data, null, 2);
        document.getElementById("resultado-simulacion").style.display = 'block';

        // Crear gráfica
        crearGrafica(data.categorias, data.frecuencias_observadas, data.frecuencias_esperadas, "Simulación");

        // Scroll hacia los resultados
        document.getElementById("resultado-simulacion").scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        ocultarCargando();
        console.error(error);
        alert("Error al conectar con la API");
    }
});

// Formulario de probabilidad exacta
document.getElementById("formulario-probabilidad").addEventListener("submit", async (e) => {
    e.preventDefault();

    const n_experimentos = parseInt(document.getElementById("n_experimentos_prob").value);
    const categorias = document.getElementById("categorias_prob").value.split(",").map(c => c.trim());
    const probabilidades = document.getElementById("probabilidades_prob").value.split(",").map(Number);
    const frecuencias_deseadas = document.getElementById("frecuencias_deseadas").value.split(",").map(Number);

    // Validación
    if (categorias.length !== probabilidades.length || probabilidades.length !== frecuencias_deseadas.length) {
        alert("Todas las listas deben tener la misma longitud");
        return;
    }

    const payload = { n_experimentos, categorias, probabilidades, frecuencias_deseadas };

    try {
        mostrarCargando("Calculando probabilidad exacta...");
        
        const res = await fetch("/calcular-probabilidad", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        ocultarCargando();
        
        if (data.error) {
            alert("Error: " + data.error);
            return;
        }

        ultimoResultadoProbabilidad = payload;
        mostrarResultadoProbabilidad(data);

        // Scroll hacia los resultados
        document.getElementById("resultado-probabilidad").scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        ocultarCargando();
        console.error(error);
        alert("Error al conectar con la API");
    }
});

// Botón de verificación
document.getElementById("btn-verificar").addEventListener("click", async () => {
    if (!ultimoResultadoProbabilidad) return;

    try {
        mostrarCargando("Realizando simulación de verificación...");
        
        const res = await fetch("/simular-verificacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ultimoResultadoProbabilidad)
        });

        const data = await res.json();
        ocultarCargando();
        
        if (data.error) {
            alert("Error: " + data.error);
            return;
        }

        mostrarVerificacion(data);

        // Scroll hacia la verificación
        document.getElementById("resultado-verificacion").scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        ocultarCargando();
        console.error(error);
        alert("Error al realizar la verificación");
    }
});

function mostrarResultadoProbabilidad(data) {
    // Crear HTML para el cálculo detallado
    const calculoHTML = `
        <div class="calculo-box">
            <h4>📐 Fórmula Multinomial</h4>
            <div class="formula-display">
                <p><strong>P(${data.frecuencias_deseadas.join(',')}) = Coeficiente × Producto de probabilidades</strong></p>
            </div>
            <div class="calculo-pasos">
                <p><strong>1. Coeficiente multinomial:</strong> ${data.coeficiente_multinomial.toLocaleString()}</p>
                <p><strong>2. Producto de probabilidades:</strong> ${data.producto_probabilidades.toExponential(6)}</p>
                <p><strong>3. Resultado:</strong> ${data.calculo_completo.formula}</p>
            </div>
            <div class="resultado-final">
                <strong>P(${data.frecuencias_deseadas.join(',')}) = ${data.probabilidad_exacta.toExponential(8)}</strong>
            </div>
        </div>
        
        <div class="detalles-calculo">
            <h4>🔍 Detalles por Categoría</h4>
            ${data.detalles_calculo.map(detalle => 
                `<div class="detalle-item">
                    <strong>${detalle.categoria}:</strong> ${detalle.termino} = ${detalle.valor.toExponential(4)}
                </div>`
            ).join('')}
        </div>
    `;
    
    // Crear HTML para la interpretación
    const interpretacionHTML = `
        <div class="interpretacion-box">
            <h4>💡 Interpretación del Resultado</h4>
            <div class="interpretacion-grid">
                <div class="interpretacion-item">
                    <span class="label">Probabilidad:</span>
                    <span class="value">${data.interpretacion.porcentaje.toExponential(6)}%</span>
                </div>
                <div class="interpretacion-item">
                    <span class="label">Frecuencia:</span>
                    <span class="value">1 en ${data.interpretacion.uno_en.toLocaleString()} experimentos</span>
                </div>
                <div class="interpretacion-item">
                    <span class="label">Clasificación:</span>
                    <span class="value rareza-${data.interpretacion.rareza.replace(' ', '-')}">${data.interpretacion.rareza}</span>
                </div>
                ${data.interpretacion.anos_si_diario > 0 ? 
                    `<div class="interpretacion-item">
                        <span class="label">Si fuera diario:</span>
                        <span class="value">Una vez cada ${data.interpretacion.anos_si_diario.toLocaleString()} años</span>
                    </div>` : 
                    ''}
            </div>
        </div>
    `;

    document.getElementById("calculo-detallado").innerHTML = calculoHTML;
    document.getElementById("interpretacion").innerHTML = interpretacionHTML;
    document.getElementById("resultado-probabilidad").style.display = 'block';
    document.getElementById("btn-verificar").style.display = 'inline-block';

    // Crear gráfica comparativa
    crearGrafica(data.categorias, data.frecuencias_deseadas, data.frecuencias_esperadas, "Probabilidad Exacta");
}

function mostrarVerificacion(data) {
    const sim = data.simulacion;
    const verificacionHTML = `
        <div class="verificacion-box">
            <h4>🧪 Resultados de la Simulación</h4>
            <div class="verificacion-grid">
                <div class="verificacion-item">
                    <span class="label">Simulaciones realizadas:</span>
                    <span class="value">${sim.num_simulaciones.toLocaleString()}</span>
                </div>
                <div class="verificacion-item">
                    <span class="label">Éxitos encontrados:</span>
                    <span class="value">${sim.exitos_encontrados.toLocaleString()}</span>
                </div>
                <div class="verificacion-item">
                    <span class="label">Probabilidad simulada:</span>
                    <span class="value">${sim.probabilidad_simulada.toExponential(6)}</span>
                </div>
                <div class="verificacion-item">
                    <span class="label">Probabilidad teórica:</span>
                    <span class="value">${sim.probabilidad_teorica.toExponential(6)}</span>
                </div>
                <div class="verificacion-item">
                    <span class="label">Error porcentual:</span>
                    <span class="value">${sim.error_porcentual.toFixed(2)}%</span>
                </div>
                <div class="verificacion-item">
                    <span class="label">Concordancia:</span>
                    <span class="value concordancia-${sim.concordancia}">${sim.concordancia.toUpperCase()}</span>
                </div>
            </div>
            <div class="concordancia-mensaje">
                ${getConcordanciaMessage(sim.concordancia, sim.error_porcentual)}
            </div>
        </div>
    `;

    document.getElementById("verificacion-detalle").innerHTML = verificacionHTML;
    document.getElementById("resultado-verificacion").style.display = 'block';
}

function getConcordanciaMessage(concordancia, errorPorcentual) {
    switch(concordancia) {
        case 'excelente':
            return `<div class="mensaje-excelente">✅ Excelente concordancia entre teoría y simulación (${errorPorcentual.toFixed(2)}% de error)</div>`;
        case 'buena':
            return `<div class="mensaje-buena">✅ Buena concordancia entre teoría y simulación (${errorPorcentual.toFixed(2)}% de error)</div>`;
        case 'regular':
            return `<div class="mensaje-regular">⚠️ Concordancia regular. Considere aumentar el número de simulaciones</div>`;
        default:
            return '';
    }
}

function crearGrafica(labels, observadas, esperadas, titulo) {
            if (chart) chart.destroy();

            document.getElementById('grafica-container').style.display = 'block';

            chart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: titulo === "Simulación" ? "Frecuencias Observadas" : "Frecuencias Deseadas",
                            data: observadas,
                            backgroundColor: "rgba(54, 162, 235, 0.8)",
                            borderColor: "rgba(54, 162, 235, 1)",
                            borderWidth: 2
                        },
                        {
                            label: "Frecuencias Esperadas",
                            data: esperadas,
                            backgroundColor: "rgba(255, 206, 86, 0.8)",
                            borderColor: "rgba(255, 206, 86, 1)",
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `${titulo} - Comparación de Frecuencias`,
                            font: { size: 16 }
                        },
                        legend: {
                            position: 'top'
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
}