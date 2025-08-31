from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
import numpy as np

app = FastAPI()

# Servir carpeta static
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def root():
    return FileResponse("app/static/index.html")

# Modelo de entrada
class MultinomialRequest(BaseModel):
    n_experimentos: int
    categorias: List[str]
    probabilidades: List[float]


@app.post("/multinomial")
def multinomial(req: MultinomialRequest):
    if not np.isclose(sum(req.probabilidades), 1.0):
        return {"error": "La suma de probabilidades debe ser 1"}

    resultados = np.random.multinomial(req.n_experimentos, req.probabilidades)
    esperadas = [req.n_experimentos * p for p in req.probabilidades]

    return {
        "categorias": req.categorias,
        "frecuencias_observadas": resultados.tolist(),
        "frecuencias_esperadas": esperadas
    }
