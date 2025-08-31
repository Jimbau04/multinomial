const ctx = document.getElementById("grafica").getContext("2d");
let chart; // Para almacenar la gráfica y poder actualizarla

document.getElementById("formulario").addEventListener("submit", async (e) => {
    e.preventDefault();

    const n_experimentos = parseInt(document.getElementById("n_experimentos").value);
    const categorias = document.getElementById("categorias").value.split(",").map(c => c.trim());
    const probabilidades = document.getElementById("probabilidades").value.split(",").map(Number);

    const payload = { n_experimentos, categorias, probabilidades };

    try {
        const res = await fetch("http://127.0.0.1:8000/multinomial/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorData = await res.json();
            alert("Error: " + errorData.detail);
            return;
        }

        const data = await res.json();

        // Mostrar resultado en texto
        document.getElementById("resultado_texto").textContent = JSON.stringify(data, null, 2);

        // Actualizar gráfica
        const labels = data.categorias;
        const observadas = data.frecuencias_observadas;
        const esperadas = data.frecuencias_esperadas;

        if (chart) chart.destroy(); // Si ya existe, destruirla antes de crear otra

        chart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Frecuencias Observadas",
                        data: observadas,
                        backgroundColor: "rgba(54, 162, 235, 0.6)"
                    },
                    {
                        label: "Frecuencias Esperadas",
                        data: esperadas,
                        backgroundColor: "rgba(255, 206, 86, 0.6)"
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

    } catch (error) {
        console.error(error);
        alert("Error al conectar con la API");
    }
});
