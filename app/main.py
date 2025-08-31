from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
import random
import math

app = FastAPI()

# Servir carpeta static
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def root():
    return FileResponse("app/static/index.html")

# Modelos de entrada
class MultinomialRequest(BaseModel):
    n_experimentos: int
    categorias: List[str]
    probabilidades: List[float]

class ProbabilityRequest(BaseModel):
    n_experimentos: int
    categorias: List[str]
    probabilidades: List[float]
    frecuencias_deseadas: List[int]

# Funciones auxiliares para cálculos
def factorial(n):
    """Calcula el factorial de n"""
    if n <= 1:
        return 1
    resultado = 1
    for i in range(2, n + 1):
        resultado *= i
    return resultado

def coeficiente_multinomial(n, frecuencias):
    """Calcula el coeficiente multinomial: n! / (n1! * n2! * ... * nk!)"""
    numerador = factorial(n)
    denominador = 1
    for freq in frecuencias:
        denominador *= factorial(freq)
    return numerador / denominador

def potencia(base, exponente):
    """Calcula base^exponente de manera sencilla"""
    if exponente == 0:
        return 1
    resultado = 1
    for _ in range(exponente):
        resultado *= base
    return resultado

def funcion_densidad_multinomial(n, frecuencias, probabilidades):
    """Calcula la función de densidad multinomial"""
    # Verificar que las frecuencias sumen n
    if sum(frecuencias) != n:
        return 0
    
    # Calcular coeficiente multinomial
    coef = coeficiente_multinomial(n, frecuencias)
    
    # Calcular producto de probabilidades
    producto_prob = 1
    for freq, prob in zip(frecuencias, probabilidades):
        producto_prob *= potencia(prob, freq)
    
    return coef * producto_prob

def simular_multinomial_simple(n_experimentos, probabilidades):
    """Simula experimentos multinomiales sin usar numpy"""
    k = len(probabilidades)
    frecuencias = [0] * k
    
    # Crear probabilidades acumuladas
    prob_acumuladas = []
    acum = 0
    for prob in probabilidades:
        acum += prob
        prob_acumuladas.append(acum)
    
    # Simulación
    for _ in range(n_experimentos):
        rand_num = random.random()
        for j, prob_acum in enumerate(prob_acumuladas):
            if rand_num <= prob_acum:
                frecuencias[j] += 1
                break
    
    return frecuencias

def validar_entrada(probabilidades, frecuencias_deseadas=None, n_experimentos=None):
    """Valida los datos de entrada"""
    # Verificar que las probabilidades sumen 1
    suma_prob = sum(probabilidades)
    if not (0.99 <= suma_prob <= 1.01):  # Tolerancia para errores de punto flotante
        return f"Las probabilidades deben sumar 1.0 (suma actual: {suma_prob:.6f})"
    
    # Verificar que todas las probabilidades sean positivas
    if any(p <= 0 for p in probabilidades):
        return "Todas las probabilidades deben ser mayores que 0"
    
    # Si se proporcionan frecuencias deseadas, verificar que sean válidas
    if frecuencias_deseadas is not None and n_experimentos is not None:
        if sum(frecuencias_deseadas) != n_experimentos:
            return f"Las frecuencias deseadas deben sumar {n_experimentos}"
        
        if any(f < 0 for f in frecuencias_deseadas):
            return "Las frecuencias no pueden ser negativas"
    
    return None

@app.post("/multinomial")
def multinomial(req: MultinomialRequest):
    """Endpoint original - simulación básica"""
    error = validar_entrada(req.probabilidades)
    if error:
        return {"error": error}

    # Realizar simulación
    resultados = simular_multinomial_simple(req.n_experimentos, req.probabilidades)
    esperadas = [req.n_experimentos * p for p in req.probabilidades]

    return {
        "categorias": req.categorias,
        "frecuencias_observadas": resultados,
        "frecuencias_esperadas": esperadas
    }

@app.post("/calcular-probabilidad")
def calcular_probabilidad(req: ProbabilityRequest):
    """Nuevo endpoint - calcula la probabilidad exacta de una configuración específica"""
    
    # Validar entrada
    error = validar_entrada(req.probabilidades, req.frecuencias_deseadas, req.n_experimentos)
    if error:
        return {"error": error}
    
    try:
        # Calcular probabilidad exacta
        densidad = funcion_densidad_multinomial(
            req.n_experimentos, 
            req.frecuencias_deseadas, 
            req.probabilidades
        )
        
        # Calcular frecuencias esperadas
        frecuencias_esperadas = [req.n_experimentos * p for p in req.probabilidades]
        
        # Calcular coeficiente multinomial para información adicional
        coef = coeficiente_multinomial(req.n_experimentos, req.frecuencias_deseadas)
        
        # Calcular producto de probabilidades
        producto_prob = 1
        detalles_calculo = []
        for i, (prob, freq) in enumerate(zip(req.probabilidades, req.frecuencias_deseadas)):
            termino = potencia(prob, freq)
            producto_prob *= termino
            detalles_calculo.append({
                "categoria": req.categorias[i],
                "probabilidad": prob,
                "frecuencia": freq,
                "termino": f"({prob:.4f})^{freq}",
                "valor": termino
            })
        
        # Interpretar resultado
        interpretacion = {}
        if densidad > 0:
            porcentaje = densidad * 100
            uno_en = int(1/densidad)
            
            # Clasificar rareza
            if densidad >= 0.1:
                rareza = "muy común"
            elif densidad >= 0.01:
                rareza = "común"
            elif densidad >= 0.001:
                rareza = "poco común"
            elif densidad >= 0.0001:
                rareza = "raro"
            elif densidad >= 0.00001:
                rareza = "muy raro"
            else:
                rareza = "extremadamente raro"
            
            interpretacion = {
                "porcentaje": porcentaje,
                "uno_en": uno_en,
                "rareza": rareza,
                "anos_si_diario": uno_en // 365 if uno_en >= 365 else 0
            }
        else:
            interpretacion = {
                "porcentaje": 0,
                "uno_en": float('inf'),
                "rareza": "imposible",
                "anos_si_diario": 0
            }
        
        return {
            "categorias": req.categorias,
            "n_experimentos": req.n_experimentos,
            "probabilidades": req.probabilidades,
            "frecuencias_deseadas": req.frecuencias_deseadas,
            "frecuencias_esperadas": frecuencias_esperadas,
            "probabilidad_exacta": densidad,
            "coeficiente_multinomial": coef,
            "producto_probabilidades": producto_prob,
            "detalles_calculo": detalles_calculo,
            "interpretacion": interpretacion,
            "calculo_completo": {
                "formula": f"P(X) = {coef:,.0f} × {producto_prob:.6e}",
                "resultado": f"{densidad:.6e}"
            }
        }
        
    except Exception as e:
        return {"error": f"Error en el cálculo: {str(e)}"}

@app.post("/simular-verificacion")
def simular_verificacion(req: ProbabilityRequest):
    """Endpoint para verificar el resultado teórico mediante simulación"""
    
    # Validar entrada
    error = validar_entrada(req.probabilidades, req.frecuencias_deseadas, req.n_experimentos)
    if error:
        return {"error": error}
    
    try:
        # Calcular probabilidad teórica
        densidad_teorica = funcion_densidad_multinomial(
            req.n_experimentos, 
            req.frecuencias_deseadas, 
            req.probabilidades
        )
        
        # Determinar número de simulaciones basado en la probabilidad
        if densidad_teorica > 0:
            num_simulaciones = min(50000, max(5000, int(1/densidad_teorica * 10)))
        else:
            num_simulaciones = 10000
        
        # Realizar simulaciones
        contador_exito = 0
        for _ in range(num_simulaciones):
            frecuencias_sim = simular_multinomial_simple(req.n_experimentos, req.probabilidades)
            if frecuencias_sim == req.frecuencias_deseadas:
                contador_exito += 1
        
        probabilidad_simulada = contador_exito / num_simulaciones
        
        # Calcular estadísticas de comparación
        estadisticas = {
            "num_simulaciones": num_simulaciones,
            "exitos_encontrados": contador_exito,
            "probabilidad_simulada": probabilidad_simulada,
            "probabilidad_teorica": densidad_teorica,
            "diferencia_absoluta": abs(probabilidad_simulada - densidad_teorica),
            "error_porcentual": 0 if densidad_teorica == 0 else abs(probabilidad_simulada - densidad_teorica) / densidad_teorica * 100
        }
        
        # Evaluar concordancia
        if densidad_teorica > 0:
            if estadisticas["error_porcentual"] < 10:
                concordancia = "excelente"
            elif estadisticas["error_porcentual"] < 25:
                concordancia = "buena"
            else:
                concordancia = "regular"
        else:
            concordancia = "no aplicable"
        
        estadisticas["concordancia"] = concordancia
        
        return {
            "simulacion": estadisticas,
            "mensaje": f"Simulación completada con {num_simulaciones:,} experimentos"
        }
        
    except Exception as e:
        return {"error": f"Error en la simulación: {str(e)}"}

@app.get("/info")
def info():
    """Endpoint informativo sobre la distribución multinomial"""
    return {
        "titulo": "Calculadora de Distribución Multinomial",
        "descripcion": "Esta aplicación calcula probabilidades exactas usando la función de densidad multinomial",
        "formula": "P(X₁=n₁, X₂=n₂, ..., Xₖ=nₖ) = (n!)/(n₁!×n₂!×...×nₖ!) × θ₁^n₁ × θ₂^n₂ × ... × θₖ^nₖ",
        "donde": {
            "n": "número total de experimentos",
            "nᵢ": "frecuencia deseada para la categoría i",
            "θᵢ": "probabilidad de la categoría i"
        },
        "endpoints": {
            "/multinomial": "Simulación básica (original)",
            "/calcular-probabilidad": "Cálculo de probabilidad exacta",
            "/simular-verificacion": "Verificación mediante simulación"
        }
    }