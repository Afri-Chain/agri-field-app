// src/core/model-loader.js
// Downloads and caches ONNX models referenced by the marketplace, then runs
// inference locally via onnxruntime-web (WASM/WebGPU backend).

import * as ort from 'onnxruntime-web';

export class EdgeModelLoader {
  constructor(db) {
    this.db = db;
    this._sessions = new Map(); // modelId -> ort.InferenceSession
  }

  async loadModel(modelId, modelUrl) {
    if (this._sessions.has(modelId)) return this._sessions.get(modelId);

    const session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['webgpu', 'wasm'],
    });
    this._sessions.set(modelId, session);
    return session;
  }

  async predict(modelId, inputTensor) {
    const session = this._sessions.get(modelId);
    if (!session) throw new Error(`Model ${modelId} not loaded`);
    const feeds = { input: inputTensor };
    const results = await session.run(feeds);
    return results;
  }

  unloadModel(modelId) {
    this._sessions.delete(modelId);
  }
}
