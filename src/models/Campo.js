// Representa um campo esportivo
export class Campo {
  constructor(id, nome) {
    this.id = id; // ID único no Firestore
    this.nome = nome; // Ex.: "Campo 1"
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Campo(doc.id, data.nome);
  }

  toFirestore() {
    return { nome: this.nome };
  }
}
