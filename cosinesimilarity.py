import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

data = [
    {
        "query": "What is RAG?",
        "reference": "RAG combines retrieval and generation.",
        "model_a": "RAG retrieves documents before generation.",
        "model_b": "RAG is a database."
    }
]

df = pd.DataFrame(data)

model = SentenceTransformer('all-MiniLM-L6-v2')

scores_a = []
scores_b = []

for _, row in df.iterrows():

    ref_emb = model.encode(row["reference"])
    a_emb = model.encode(row["model_a"])
    b_emb = model.encode(row["model_b"])

    score_a = cosine_similarity([ref_emb], [a_emb])[0][0]
    score_b = cosine_similarity([ref_emb], [b_emb])[0][0]

    scores_a.append(score_a)
    scores_b.append(score_b)

df["score_a"] = scores_a
df["score_b"] = scores_b


print(df)