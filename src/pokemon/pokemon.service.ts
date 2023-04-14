import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Pokemon } from './entities/pokemon.entity';
import { Model, isValidObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

type NewType = string;

@Injectable()
export class PokemonService {

  private defaultLimit:number
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel:Model<Pokemon>,
    private readonly configService:ConfigService
  ){
    this.defaultLimit = configService.get<number>('default-limit')
  }

  async create(createPokemonDto: CreatePokemonDto) {

    try {

      createPokemonDto.name = createPokemonDto.name.toLocaleLowerCase()
      const pokemon = await this.pokemonModel.create(createPokemonDto)
      return pokemon

    } catch (error) {
      if(error.code == 11000){
        throw new BadRequestException(`Pokemon exists in db ${JSON.stringify(error.keyValue)}`)
      }
      throw new InternalServerErrorException()
    }
  }

  findAll(paginationDto:PaginationDto) {
    const {limit=this.defaultLimit,offset=0} = paginationDto
    this.pokemonModel.find({})
    .limit(limit)
    .skip(offset)
    .sort({
      no:1
    })
    .select('-__v')
  }

  async findOne(id: string) {
    let pokemon:Pokemon
    if(!isNaN(+id)){
      pokemon = await this.pokemonModel.findOne({no:id})
    }
    if(!pokemon && isValidObjectId(id)){
      pokemon = await this.pokemonModel.findById(id)
    }
    if(!pokemon){
      pokemon=await this.pokemonModel.findOne({name:id.toLowerCase().trim})
    }
    if(!pokemon){
      throw new NotFoundException(`Pokemon with id, name or no ${id} no found`)
    }

    return pokemon;
  }

  async update(id: string, updatePokemonDto: UpdatePokemonDto) {
    
    try {
      let pokemon = await this.findOne(id)
    await pokemon.updateOne(updatePokemonDto,{new:true})
    return pokemon;
    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async remove(id: string) {
    //Dos consultas:
    /* const pokemon = await this.findOne(id)
    await pokemon.deleteOne() */

    //Una sola consulta
    const {deletedCount} = await this.pokemonModel.deleteOne({_id:id})
    if(deletedCount===0){
      throw new BadRequestException(`Pokemon with id "${id}" no found`)
    }
    return `This action removes a #${id} pokemon`;
  }

  private handleExceptions(error:any){
    if(error.code == 11000){
      throw new BadRequestException(`Pokemon exists in db ${JSON.stringify(error.keyValue)}`)
    }
    throw new InternalServerErrorException()
  }
}
