// src/models/Aluno.js
export class Aluno {
  constructor(id, nome, responsavel, telefoneResponsavel, idade, turma) {
    this.id = id;
    this.nome = nome;
    this.responsavel = responsavel;
    this.telefoneResponsavel = telefoneResponsavel;
    this.idade = idade;
    this.turma = turma;
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new Aluno(
      doc.id,
      data.nome,
      data.responsavel,
      data.telefoneResponsavel,
      data.idade,
      data.turma
    );
  }

  toFirestore() {
    return {
      nome: this.nome,
      responsavel: this.responsavel,
      telefoneResponsavel: this.telefoneResponsavel,
      idade: this.idade,
      turma: this.turma,
    };
  }
}
