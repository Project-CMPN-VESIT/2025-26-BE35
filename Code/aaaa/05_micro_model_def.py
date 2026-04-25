"""
01_micro_model.py
Lightweight micro model for sub-5-minute predictions.
"""

import torch
import torch.nn as nn

class LightweightMicroModel(nn.Module):
    def __init__(self, input_dim=16, hidden_dim=64):
        super(LightweightMicroModel, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(p=0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(p=0.2),
            nn.Linear(64, 1)
        )

    def forward(self, x):
        return self.net(x)


if __name__ == '__main__':
    # quick smoke test
    model = LightweightMicroModel()
    x = torch.randn(4, 11)
    out = model(x)
    print(f"LightweightMicroModel output shape: {out.shape}")
