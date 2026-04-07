"""
02_multi_task_model.py
Minimal MultiTaskTransformer stub compatible with existing pipeline.
"""

import torch
import torch.nn as nn

class MultiTaskTransformer(nn.Module):
    def __init__(self, input_dim=100, d_model=256, nhead=4, num_layers=2):
        super(MultiTaskTransformer, self).__init__()
        self.input_proj = nn.Linear(input_dim, d_model)
        encoder_layer = nn.TransformerEncoderLayer(d_model=d_model, nhead=nhead)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.price_head = nn.Linear(d_model, 1)
        self.direction_head = nn.Linear(d_model, 1)  # raw logits

    def forward(self, x):
        # x: (batch, seq_len, input_dim) -> flatten seq
        b, seq, _ = x.shape
        x = self.input_proj(x)  # (b, seq, d_model)
        x = x.permute(1, 0, 2)   # (seq, b, d_model) for transformer
        h = self.transformer(x)  # (seq, b, d_model)
        h = h.mean(dim=0)        # (b, d_model)
        price = self.price_head(h)
        direction_logits = self.direction_head(h)
        return price, direction_logits


if __name__ == '__main__':
    m = MultiTaskTransformer()
    x = torch.randn(8, 10, 100)
    price, dir_logit = m(x)
    print('price.shape', price.shape, 'dir_logits.shape', dir_logit.shape)
