# Veri kaynakları ve lisans özetleri

Bu klasördeki scriptler **üçüncü taraf tıbbi soru veri kümelerini** Hugging Face üzerinden indirip Klinikiq birleşik şemasına dönüştürür. **Hukuki kullanım için kendi ürününüzde mutlaka tam lisans metinlerini ve atıfları doğrulayın.**

## MedQA-USMLE (çoktan seçmeli)

| Alan | Bilgi |
|------|--------|
| **Orijinal makale / veri** | Jin et al., *What Disease does this Patient Have?* — [arXiv:2009.13081](https://arxiv.org/abs/2009.13081) |
| **Kod deposu** | [github.com/jind11/MedQA](https://github.com/jind11/MedQA) — depo `LICENSE`: **MIT** (yazılım) |
| **HF mirror (scriptin kullandığı)** | [huggingface.co/datasets/GBaker/MedQA-USMLE-4-options](https://huggingface.co/datasets/GBaker/MedQA-USMLE-4-options) — kartta **license: cc-by-4.0** |
| **Ham büyük arşiv** | [Google Drive (README’deki link)](https://github.com/jind11/MedQA#data) |

Sınav sorularının kendisi için **makale + HF dataset card + orijinal dağıtım** lisanslarını birlikte değerlendirin.

## PubMedQA (etiketli alt küme)

| Alan | Bilgi |
|------|--------|
| **Makale** | Jin et al., EMNLP 2019 — [PubMedQA](https://pubmedqa.github.io/) |
| **Kod deposu** | [github.com/pubmedqa/pubmedqa](https://github.com/pubmedqa/pubmedqa) — **MIT** |
| **HF (scriptin kullandığı)** | [huggingface.co/datasets/qiaojin/PubMedQA](https://huggingface.co/datasets/qiaojin/PubMedQA) — yapılandırma `pqa_labeled` (~1000 örnek) — kartta **MIT** |

## Atıf (örnek BibTeX)

MedQA:

```bibtex
@article{jin2020disease,
  title={What Disease does this Patient Have? A Large-scale Open Domain Question Answering Dataset from Medical Exams},
  author={Jin, Di and Pan, Eileen and Oufattole, Nassim and Weng, Wei-Hung and Fang, Hanyi and Szolovits, Peter},
  journal={arXiv preprint arXiv:2009.13081},
  year={2020}
}
```

PubMedQA:

```bibtex
@inproceedings{jin2019pubmedqa,
  title={PubMedQA: A Dataset for Biomedical Research Question Answering},
  author={Jin, Qiao and Dhingra, Bhuwan and Liu, Zhengping and Cohen, William and Lu, Xinghua},
  booktitle={EMNLP-IJCNLP},
  pages={2567--2577},
  year={2019}
}
```
